import { SelectPrompt } from './select';
import { MultiColumnSelectOptions, SelectChoice } from '../types';
import { theme } from '../theme';
import { ANSI } from '../ansi';
import { stringWidth } from '../utils';
import { symbols } from '../symbols';

export class MultiColumnSelectPrompt<V> extends SelectPrompt<V, MultiColumnSelectOptions<V>> {
    protected cols: number = 1;
    protected colWidth: number = 0;

    constructor(options: MultiColumnSelectOptions<V>) {
        super(options);
        this.calculateLayout();
    }

    private calculateLayout() {
        const termWidth = process.stdout.columns || 80;
        const choices = this.options.choices.filter(c => !this.isSeparator(c)) as SelectChoice<V>[];

        if (choices.length === 0) {
            this.cols = 1;
            this.colWidth = termWidth;
            return;
        }

        // Calculate max item width
        let maxLen = 0;
        for (const c of choices) {
            const len = stringWidth(c.title);
            if (len > maxLen) maxLen = len;
        }

        // Add padding (pointer + space + item + space)
        const itemWidth = maxLen + 4;

        if (typeof this.options.cols === 'number') {
            this.cols = this.options.cols;
        } else {
            // Auto
            this.cols = Math.floor(termWidth / itemWidth);
            if (this.cols < 1) this.cols = 1;
        }

        // Final column width
        this.colWidth = Math.floor(termWidth / this.cols);
    }

    protected render(_firstRender: boolean) {
        let output = '';
        const choices = this.getFilteredChoices();

        // Header
        const searchStr = this.searchBuffer ? ` ${theme.muted}(Filter: ${this.searchBuffer})${ANSI.RESET}` : '';
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

                let cellContent = '';
                if (idx === this.selectedIndex) {
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

    protected handleInput(char: string) {
        const choices = this.getFilteredChoices();

        if (char === '\r' || char === '\n') {
            if (choices.length > 0) {
                this.submit((choices[this.selectedIndex] as any).value);
            }
            return;
        }

        if (this.isUp(char)) {
            const newIndex = this.selectedIndex - this.cols;
            if (newIndex >= 0) {
                this.selectedIndex = newIndex;
            }
            this.render(false);
            return;
        }

        if (this.isDown(char)) {
            const newIndex = this.selectedIndex + this.cols;
            if (newIndex < choices.length) {
                this.selectedIndex = newIndex;
            }
            this.render(false);
            return;
        }

        if (this.isLeft(char)) {
            if (this.selectedIndex > 0) {
                this.selectedIndex--;
            } else {
                this.selectedIndex = choices.length - 1;
            }
            this.render(false);
            return;
        }

        if (this.isRight(char)) {
            if (this.selectedIndex < choices.length - 1) {
                this.selectedIndex++;
            } else {
                this.selectedIndex = 0;
            }
            this.render(false);
            return;
        }

        // Backspace
        if (char === '\u0008' || char === '\x7f') {
            if (this.searchBuffer.length > 0) {
                this.searchBuffer = this.searchBuffer.slice(0, -1);
                this.selectedIndex = 0;
                this.calculateLayout();
                this.render(false);
            }
            return;
        }

        // Typing
        if (char.length === 1 && !/^[\x00-\x1F]/.test(char) && !char.startsWith('\x1b')) {
            this.searchBuffer += char;
            this.selectedIndex = 0;
            this.render(false);
        }
    }
}

