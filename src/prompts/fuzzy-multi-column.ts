import { MultiColumnSelectPrompt } from './multi-column-select';
import { MultiColumnSelectOptions } from '../types';
import { theme } from '../theme';
import { ANSI } from '../ansi';
import { fuzzyMatch, stringWidth } from '../utils';
import { symbols } from '../symbols';

export class FuzzyMultiColumnPrompt<V> extends MultiColumnSelectPrompt<V> {
    private filteredResults: any[] = [];
    private debounceTimer: any;

    constructor(options: MultiColumnSelectOptions<V>) {
        super(options);
        this.filteredResults = this.options.choices;
    }

    protected getFilteredChoices() {
        return this.filteredResults || this.options.choices;
    }

    protected handleInput(char: string) {
        // Backspace
        if (char === '\u0008' || char === '\x7f') {
            if (this.searchBuffer.length > 0) {
                this.searchBuffer = this.searchBuffer.slice(0, -1);
                this.performSearch();
            }
            return;
        }

        // Intercept typing to add debounce
        if (char.length === 1 && !/^[\x00-\x1F]/.test(char) && !char.startsWith('\x1b')) {
            this.searchBuffer += char;

            // Check if debounce is needed
            if (this.options.choices.length > 1000) {
                if (this.debounceTimer) clearTimeout(this.debounceTimer);
                this.debounceTimer = setTimeout(() => {
                    this.performSearch();
                }, 150); // 150ms debounce
            } else {
                this.performSearch();
            }
            return;
        }

        super.handleInput(char);
    }

    private performSearch() {
        if (!this.searchBuffer) {
            this.filteredResults = this.options.choices;
        } else {
            const results = this.options.choices.map(c => {
                if (this.isSeparator(c)) return null;
                const match = fuzzyMatch(this.searchBuffer, (c as any).title);
                return { choice: c, match };
            }).filter(item => item && item.match !== null)
                // Sort by score descending
                .sort((a, b) => b!.match!.score - a!.match!.score);

            this.filteredResults = results.map(r => {
                (r!.choice as any)._match = r!.match;
                return r!.choice;
            });
        }

        this.selectedIndex = 0;
        this.render(false);
    }

    private highlight(text: string, indices: number[], isSelected: boolean): string {
        let output = '';
        const indexSet = new Set(indices);
        for (let i = 0; i < text.length; i++) {
            if (indexSet.has(i)) {
                if (isSelected) {
                    output += `${ANSI.BOLD}${ANSI.FG_WHITE}${text[i]}${theme.main}`; // Reset to main theme
                } else {
                    output += `${ANSI.BOLD}${ANSI.FG_CYAN}${text[i]}${ANSI.RESET}`;
                }
            } else {
                output += text[i];
            }
        }
        return output;
    }

    protected render(_firstRender: boolean) {
        let output = '';
        const choices = this.getFilteredChoices();

        // Header
        const searchStr = this.searchBuffer ? ` ${theme.muted}(Fuzzy: ${this.searchBuffer})${ANSI.RESET}` : '';
        output += `${theme.success}?${ANSI.RESET} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET}${searchStr}\n`;

        if (choices.length === 0) {
            output += `  ${theme.muted}No results found${ANSI.RESET}`;
            this.renderFrame(output);
            return;
        }

        // Grid Render
        const totalRows = Math.ceil(choices.length / this.cols);

        // Adjust Scroll
        const currentRow = Math.floor(this.selectedIndex / this.cols);
        if (currentRow < this.scrollTop) {
            this.scrollTop = currentRow;
        } else if (currentRow >= this.scrollTop + this.pageSize) {
            this.scrollTop = currentRow - this.pageSize + 1;
        }

        // Edge case: if list shrinks
        if (this.scrollTop > totalRows - 1) {
            this.scrollTop = Math.max(0, totalRows - this.pageSize);
        }

        const startRow = this.scrollTop;
        const endRow = Math.min(totalRows, startRow + this.pageSize);

        for (let r = startRow; r < endRow; r++) {
            let rowStr = '';
            for (let c = 0; c < this.cols; c++) {
                const idx = r * this.cols + c;
                if (idx >= choices.length) break;

                const choice = choices[idx];

                // Truncate if needed
                let title = (choice as any).title || '';
                if (stringWidth(title) > this.colWidth - 3) {
                    title = title.slice(0, this.colWidth - 4) + '…';
                }

                const match = (choice as any)._match;
                const isSelected = idx === this.selectedIndex;

                if (match && this.searchBuffer) {
                    title = this.highlight(title, match.indices, isSelected);
                }

                let cellContent = '';
                if (isSelected) {
                    cellContent = `${theme.main}${symbols.pointer} ${title}${ANSI.RESET}`;
                } else {
                    cellContent = `  ${title}`;
                }

                // Pad cell to colWidth
                const currentWidth = stringWidth(this.stripAnsi(cellContent));
                const padding = Math.max(0, this.colWidth - currentWidth);

                // Add cell to row
                rowStr += cellContent + ' '.repeat(padding);
            }
            output += rowStr + '\n';
        }

        // Remove trailing newline
        if (output.endsWith('\n')) output = output.slice(0, -1);

        this.renderFrame(output);
    }
}
