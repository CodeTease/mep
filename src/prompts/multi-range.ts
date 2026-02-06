import { SelectRangePrompt } from './select-range';
import { SelectRangeOptions } from '../types';
import { theme } from '../theme';
import { ANSI } from '../ansi';
import { symbols } from '../symbols';

export class MultiRangePrompt<V> extends SelectRangePrompt<V> {
    private committedRanges: { start: number; end: number }[] = [];

    constructor(options: SelectRangeOptions<V>) {
        super(options);
    }

    private mergeRanges() {
        if (this.committedRanges.length === 0) return;

        // Sort by start index
        this.committedRanges.sort((a, b) => a.start - b.start);

        const merged: { start: number; end: number }[] = [];
        let current = this.committedRanges[0];

        for (let i = 1; i < this.committedRanges.length; i++) {
            const next = this.committedRanges[i];

            if (current.end >= next.start - 1) { // Overlap or adjacent
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
            if (choices.length === 0) return;

            // If user was dragging, commit that range first
            if (this.anchorIndex !== null) {
                const start = Math.min(this.anchorIndex, this.selectedIndex);
                const end = Math.max(this.anchorIndex, this.selectedIndex);
                this.committedRanges.push({ start, end });
                this.mergeRanges();
                this.anchorIndex = null;
            }

            // Collect all indices from committed ranges
            const allIndices = new Set<number>();
            for (const range of this.committedRanges) {
                for (let i = range.start; i <= range.end; i++) {
                    allIndices.add(i);
                }
            }

            if (allIndices.size === 0) {
                allIndices.add(this.selectedIndex);
            }

            const selectedItems: V[] = [];
            const sortedIndices = Array.from(allIndices).sort((a, b) => a - b);

            for (const idx of sortedIndices) {
                if (idx < choices.length) {
                    const choice = choices[idx];
                    if (!this.isSeparator(choice)) {
                        selectedItems.push((choice as any).value);
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

                this.committedRanges.push({ start, end });
                this.mergeRanges();

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
                if (index > 0) output += '\n';

                let isCommitted = false;
                for (const range of this.committedRanges) {
                    if (actualIndex >= range.start && actualIndex <= range.end) {
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
