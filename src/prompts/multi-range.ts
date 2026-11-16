import { ANSI } from '../ansi';
import { symbols } from '../symbols';
import { theme } from '../theme';
import type { SelectRangeOptions } from '../types';
import { SelectRangePrompt } from './select-range';

export class MultiRangePrompt<V> extends SelectRangePrompt<V> {
    // Ranges are stored as indexes into `options.choices`, not into the filtered
    // list, so changing the search buffer cannot re-map or drop them.
    private committedRanges: { start: number; end: number }[] = [];

    constructor(options: SelectRangeOptions<V>) {
        super(options);
    }

    /**
     * Commit a range expressed in filtered positions by translating it to
     * indexes into `options.choices`.
     */
    private commitFilteredRange(start: number, end: number, filteredIndexes: number[]) {
        const startIndex = filteredIndexes[start];
        const endIndex = filteredIndexes[end];
        if (startIndex === undefined || endIndex === undefined) return;

        this.committedRanges.push({ start: startIndex, end: endIndex });
        this.mergeRanges();
    }

    private mergeRanges() {
        if (this.committedRanges.length === 0) return;

        // Sort by start index
        this.committedRanges.sort((a, b) => a.start - b.start);

        const merged: { start: number; end: number }[] = [];
        let current = this.committedRanges[0];

        for (let i = 1; i < this.committedRanges.length; i++) {
            const next = this.committedRanges[i];

            if (current.end >= next.start - 1) {
                // Overlap or adjacent
                current.end = Math.max(current.end, next.end);
            } else {
                merged.push(current);
                current = next;
            }
        }
        merged.push(current);
        this.committedRanges = merged;
    }

    protected handleInput(char: string, key?: Buffer) {
        // Handle Enter (Submit)
        if (char === '\r' || char === '\n') {
            const choices = this.getFilteredChoices();
            const filteredIndexes = this.getFilteredIndexes();

            // If user was dragging, commit that range first
            if (this.anchorIndex !== null && choices.length > 0) {
                const start = Math.min(this.anchorIndex, this.selectedIndex);
                const end = Math.max(this.anchorIndex, this.selectedIndex);
                this.commitFilteredRange(start, end, filteredIndexes);
                this.anchorIndex = null;
            }

            // Collect all indexes from committed ranges
            const allIndices = new Set<number>();
            for (const range of this.committedRanges) {
                for (let i = range.start; i <= range.end; i++) {
                    allIndices.add(i);
                }
            }

            // Fall back to the current cursor when nothing was committed
            if (allIndices.size === 0) {
                const currentIndex = filteredIndexes[this.selectedIndex];
                if (currentIndex === undefined) return;
                allIndices.add(currentIndex);
            }

            const allChoices = this.options.choices;
            const selectedItems: V[] = [];
            const sortedIndices = Array.from(allIndices).sort((a, b) => a - b);

            for (const idx of sortedIndices) {
                if (idx < allChoices.length) {
                    const choice = allChoices[idx];
                    if (!this.isSeparator(choice)) {
                        selectedItems.push(choice.value);
                    }
                }
            }

            this.submit(selectedItems as any);
            return;
        }

        // Handle Space (Anchor/Commit)
        if (char === ' ') {
            if (this.anchorIndex === null) {
                // Start dragging
                this.anchorIndex = this.selectedIndex;
            } else {
                // Commit range
                const start = Math.min(this.anchorIndex, this.selectedIndex);
                const end = Math.max(this.anchorIndex, this.selectedIndex);

                this.commitFilteredRange(start, end, this.getFilteredIndexes());

                this.anchorIndex = null;
            }
            this.render(false);
            return;
        }
        super.handleInput(char, key);
    }

    protected render(_firstRender: boolean) {
        let output = '';
        const choices = this.getFilteredChoices();
        const filteredIndexes = this.getFilteredIndexes();

        // Scroll Logic (inherited from SelectPrompt basically, but good to ensure)
        if (this.selectedIndex < this.scrollTop) {
            this.scrollTop = this.selectedIndex;
        } else if (this.selectedIndex >= this.scrollTop + this.pageSize) {
            this.scrollTop = this.selectedIndex - this.pageSize + 1;
        }
        if (this.scrollTop > choices.length - 1) {
            this.scrollTop = Math.max(0, choices.length - this.pageSize);
        }

        // Header
        const searchStr = this.searchBuffer ? ` ${theme.muted}(Filter: ${this.searchBuffer})${ANSI.RESET}` : '';
        output += `${theme.success}?${ANSI.RESET} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET}${searchStr}\n`;

        if (choices.length === 0) {
            output += `  ${theme.muted}No results found${ANSI.RESET}`;
        } else {
            const visibleChoices = choices.slice(this.scrollTop, this.scrollTop + this.pageSize);

            visibleChoices.forEach((choice, index) => {
                const actualIndex = this.scrollTop + index;
                const choiceIndex = filteredIndexes[actualIndex];
                if (index > 0) output += '\n';

                let isCommitted = false;
                for (const range of this.committedRanges) {
                    if (choiceIndex >= range.start && choiceIndex <= range.end) {
                        isCommitted = true;
                        break;
                    }
                }

                let isDragging = false;
                if (this.anchorIndex !== null) {
                    const min = Math.min(this.anchorIndex, this.selectedIndex);
                    const max = Math.max(this.anchorIndex, this.selectedIndex);
                    if (actualIndex >= min && actualIndex <= max) {
                        isDragging = true;
                    }
                }

                if (this.isSeparator(choice)) {
                    output += `  ${ANSI.DIM}${(choice as any).text || symbols.line.repeat(8)}${ANSI.RESET}`;
                } else {
                    let prefix = '  ';
                    const title = (choice as any).title;
                    let content = title;

                    // Markers
                    if (actualIndex === this.anchorIndex) {
                        prefix = `${theme.muted}> ${ANSI.RESET}`;
                    }
                    if (actualIndex === this.selectedIndex) {
                        prefix = `${theme.main}${symbols.pointer} `;
                    }
                    if (actualIndex === this.selectedIndex && actualIndex === this.anchorIndex) {
                        prefix = `${theme.main}${symbols.pointer}>`;
                    }

                    // Highlighting
                    if (isCommitted || isDragging) {
                        // Apply highlighting style
                        // If committed, maybe green? If dragging, maybe yellow or just highlighted?

                        if (actualIndex !== this.selectedIndex && actualIndex !== this.anchorIndex) {
                            prefix = `${theme.success}* ${ANSI.RESET}`;
                        }

                        content = `${theme.success}${title}${ANSI.RESET}`;

                        if (isDragging && !isCommitted) {
                            // Distinguish dragging visual? Maybe dim?
                            // Using same style as single range prompt for consistency
                        }
                    }

                    // Cursor Underline
                    if (actualIndex === this.selectedIndex) {
                        content = `${ANSI.UNDERLINE}${content}${ANSI.RESET}`;
                    }

                    output += `${prefix}${content}`;
                }
            });
        }

        output += `\n${theme.muted}(Space to anchor/commit, Enter to submit)${ANSI.RESET}`;

        this.renderFrame(output);
    }
}
