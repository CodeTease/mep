import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { symbols } from '../symbols';
import { TableOptions, MouseEvent } from '../types';
import { stringWidth } from '../utils';

export class TablePrompt<V> extends Prompt<V, TableOptions<V>> {
    private selectedIndex: number = 0;
    private scrollTop: number = 0;
    private readonly pageSize: number;
    private colWidths: number[] = [];

    constructor(options: TableOptions<V>) {
        super(options);
        this.pageSize = options.rows || 7;
        this.calculateColWidths();
    }

    private calculateColWidths() {
        const { columns, data } = this.options;
        this.colWidths = columns.map(c => stringWidth(c));

        data.forEach(row => {
            row.row.forEach((cell, idx) => {
                if (idx < this.colWidths.length) {
                    this.colWidths[idx] = Math.max(this.colWidths[idx], stringWidth(cell));
                }
            });
        });

        // Add padding
        this.colWidths = this.colWidths.map(w => w + 2);
    }

    protected render(_firstRender: boolean) {
        // Scroll Logic
        if (this.selectedIndex < this.scrollTop) {
            this.scrollTop = this.selectedIndex;
        } else if (this.selectedIndex >= this.scrollTop + this.pageSize) {
            this.scrollTop = this.selectedIndex - this.pageSize + 1;
        }

        const maxScroll = Math.max(0, this.options.data.length - this.pageSize);
        this.scrollTop = Math.min(this.scrollTop, maxScroll);

        let output = '';

        // Title
        output += `${theme.success}?${ANSI.RESET} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET}\n`;

        // Table Header
        let headerStr = '  '; // Indent for pointer space
        this.options.columns.forEach((col, i) => {
            headerStr += this.pad(col, this.colWidths[i]);
        });
        output += `${ANSI.BOLD}${headerStr}${ANSI.RESET}\n`;

        // Table Body
        const visibleRows = this.options.data.slice(this.scrollTop, this.scrollTop + this.pageSize);

        visibleRows.forEach((item, index) => {
            const actualIndex = this.scrollTop + index;
            if (index > 0) output += '\n';

            const isSelected = actualIndex === this.selectedIndex;
            const pointer = isSelected ? `${theme.main}${symbols.pointer}${ANSI.RESET} ` : '  ';

            let rowStr = '';
            item.row.forEach((cell, colIdx) => {
                const width = this.colWidths[colIdx];
                let cellStr = this.pad(cell, width);

                if (isSelected) {
                    cellStr = `${theme.main}${cellStr}${ANSI.RESET}`;
                }
                rowStr += cellStr;
            });

            output += `${pointer}${rowStr}`;
        });

        this.renderFrame(output);
    }

    private pad(str: string, width: number): string {
        const len = stringWidth(str);
        if (len >= width) return str;
        return str + ' '.repeat(width - len);
    }

    protected handleInput(char: string) {
        if (char === '\r' || char === '\n') {
            this.submit(this.options.data[this.selectedIndex].value);
            return;
        }

        if (this.isUp(char)) {
            this.selectedIndex = this.selectedIndex > 0 ? this.selectedIndex - 1 : this.options.data.length - 1;
            this.render(false);
            return;
        }

        if (this.isDown(char)) {
            this.selectedIndex = this.selectedIndex < this.options.data.length - 1 ? this.selectedIndex + 1 : 0;
            this.render(false);
            return;
        }
    }

    protected handleMouse(event: MouseEvent) {
        if (event.action === 'scroll') {
            if (event.scroll === 'up') {
                this.selectedIndex = this.selectedIndex > 0 ? this.selectedIndex - 1 : this.options.data.length - 1;
                this.render(false);
            } else if (event.scroll === 'down') {
                this.selectedIndex = this.selectedIndex < this.options.data.length - 1 ? this.selectedIndex + 1 : 0;
                this.render(false);
            }
        }
    }
}
