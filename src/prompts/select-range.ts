import { ANSI } from '../ansi';
import { symbols } from '../symbols';
import { theme } from '../theme';
import type { MouseEvent, SelectRangeOptions } from '../types';
import { SelectPrompt } from './select';

export class SelectRangePrompt<V> extends SelectPrompt<V, SelectRangeOptions<V>> {
    /**
     * Indexes into `options.choices`, not positions in the filtered list, so
     * changing the search cannot re-map the anchored range onto other entries.
     */
    protected anchorIndex: number | null = null;
    protected rangeEndIndex: number | null = null;

    constructor(options: SelectRangeOptions<V>) {
        super(options);
        if (options.initial) {
            const maxIdx = Math.max(0, options.choices.length - 1);
            this.anchorIndex = Math.min(Math.max(0, options.initial[0]), maxIdx);
            this.rangeEndIndex = Math.min(Math.max(0, options.initial[1]), maxIdx);
            this.selectedIndex = Math.max(0, this.getFilteredIndexes().indexOf(this.rangeEndIndex));
        }
    }

    /** Index into `options.choices` under the cursor, if any. */
    protected getCursorChoiceIndex(): number | null {
        const choiceIndex = this.getFilteredIndexes()[this.selectedIndex];
        return choiceIndex === undefined ? null : choiceIndex;
    }

    /** Anchors the range at the highlighted choice. */
    protected anchorAtCursor(): void {
        const choiceIndex = this.getCursorChoiceIndex();
        if (choiceIndex === null) return;
        this.anchorIndex = choiceIndex;
        this.rangeEndIndex = choiceIndex;
    }

    /** Drops the anchor and the dragged endpoint. */
    protected clearAnchor(): void {
        this.anchorIndex = null;
        this.rangeEndIndex = null;
    }

    /** `options.choices` indexes covered by the anchored range. */
    protected getAnchoredRange(): { start: number; end: number } | null {
        if (this.anchorIndex === null) return null;
        const end = this.rangeEndIndex ?? this.anchorIndex;
        return { start: Math.min(this.anchorIndex, end), end: Math.max(this.anchorIndex, end) };
    }

    /** Values between two `options.choices` indexes, skipping separators. */
    protected collectRange(start: number, end: number): V[] {
        const selectedItems: V[] = [];
        const choices = this.options.choices;
        for (let i = Math.max(0, start); i <= end && i < choices.length; i++) {
            const choice = choices[i];
            if (!this.isSeparator(choice)) {
                selectedItems.push(choice.value);
            }
        }
        return selectedItems;
    }

    /**
     * Moves the dragged endpoint with the cursor. Called before delegating so
     * the frame rendered by the base class already shows the new range.
     */
    protected syncRangeEnd(direction: 1 | -1): void {
        if (this.anchorIndex === null) return;
        const position = this.findNextSelectableIndex(this.selectedIndex, direction);
        const choiceIndex = this.getFilteredIndexes()[position];
        if (choiceIndex !== undefined) this.rangeEndIndex = choiceIndex;
    }

    protected handleInput(char: string, _key?: Buffer) {
        // Handle Enter (Submit)
        if (char === '\r' || char === '\n') {
            // The anchored range refers to choices, so it survives filtering and
            // still submits when the current filter hides it or matches nothing.
            const range = this.getAnchoredRange();
            if (range !== null) {
                this.submit(this.collectRange(range.start, range.end));
                return;
            }

            const cursorIndex = this.getCursorChoiceIndex();
            if (cursorIndex === null) return;
            if (this.isSeparator(this.options.choices[cursorIndex])) return;

            this.submit(this.collectRange(cursorIndex, cursorIndex));
            return;
        }

        // Handle Space (Anchor)
        if (char === ' ') {
            if (this.anchorIndex === null) {
                this.anchorAtCursor();
            } else {
                this.clearAnchor();
            }
            this.render(false);
            return;
        }

        // Only navigation moves the dragged endpoint. Typing a filter changes
        // what is listed, but the anchored range keeps the choices it covers.
        if (this.isUp(char)) this.syncRangeEnd(-1);
        if (this.isDown(char)) this.syncRangeEnd(1);

        // Delegate navigation and search to SelectPrompt
        super.handleInput(char);
    }

    protected handleMouse(event: MouseEvent) {
        if (event.action === 'scroll') {
            this.syncRangeEnd(event.scroll === 'up' ? -1 : 1);
        }
        super.handleMouse(event);
    }

    protected render(_firstRender: boolean) {
        let output = '';
        const choices = this.getFilteredChoices();
        const filteredIndexes = this.getFilteredIndexes();
        const range = this.getAnchoredRange();

        // Scroll Logic
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

                let isSelected = false;
                if (range !== null) {
                    if (choiceIndex >= range.start && choiceIndex <= range.end) {
                        isSelected = true;
                    }
                } else if (actualIndex === this.selectedIndex) {
                    isSelected = true;
                }

                if (this.isSeparator(choice)) {
                    output += `  ${ANSI.DIM}${choice.text || symbols.line.repeat(8)}${ANSI.RESET}`;
                } else {
                    let prefix = '  ';
                    const title = choice.title;
                    let content = title;

                    // Anchor Marker
                    if (choiceIndex === this.anchorIndex) {
                        prefix = `${theme.muted}> ${ANSI.RESET}`;
                    }

                    // Cursor Marker
                    if (actualIndex === this.selectedIndex) {
                        prefix = `${theme.main}${symbols.pointer} `;
                    }

                    // Combined Marker
                    if (actualIndex === this.selectedIndex && choiceIndex === this.anchorIndex) {
                        prefix = `${theme.main}${symbols.pointer}>`;
                    }

                    // Highlighting
                    if (isSelected) {
                        // Inside the range (and not cursor/anchor which have their own prefixes)
                        if (actualIndex !== this.selectedIndex && choiceIndex !== this.anchorIndex) {
                            prefix = `${theme.success}* ${ANSI.RESET}`;
                        }

                        content = `${theme.success}${title}${ANSI.RESET}`;
                    }

                    // Underline Cursor
                    if (actualIndex === this.selectedIndex) {
                        content = `${ANSI.UNDERLINE}${content}${ANSI.RESET}`;
                    }

                    output += `${prefix}${content}`;
                }
            });
        }

        output += `\n${theme.muted}(Space to anchor, Enter to submit)${ANSI.RESET}`;

        this.renderFrame(output);
    }
}
