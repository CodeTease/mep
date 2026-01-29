import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { symbols } from '../symbols';
import { TransferOptions, SelectChoice, MouseEvent } from '../types';
import { stringWidth } from '../utils';

export class TransferPrompt<V> extends Prompt<[V[], V[]], TransferOptions<V>> {
    private leftList: SelectChoice<V>[] = [];
    private rightList: SelectChoice<V>[] = [];
    
    private cursorLeft: number = 0;
    private cursorRight: number = 0;
    private scrollTopLeft: number = 0;
    private scrollTopRight: number = 0;
    
    private activeSide: 'left' | 'right' = 'left';
    private readonly pageSize: number = 10;

    constructor(options: TransferOptions<V>) {
        super(options);
        this.leftList = this.normalize(options.source);
        this.rightList = this.normalize(options.target || []);
    }

    private normalize(items: (string | SelectChoice<V>)[]): SelectChoice<V>[] {
        return items.map(item => {
            if (typeof item === 'string') {
                return { title: item, value: item as unknown as V };
            }
            return item;
        });
    }

    protected truncate(str: string, width: number): string {
        if (stringWidth(str) <= width) return str;
        // Simple truncation. A better one would use binary search but this is sufficient for now.
        // We just slice and check width, reducing until it fits.
        let res = str;
        while (stringWidth(res + '...') > width && res.length > 0) {
            res = res.slice(0, -1);
        }
        return res + '...';
    }

    protected render(firstRender: boolean) {
        // Assume standard terminal width ~80 if unknown, but better to be safe.
        // We'll use a fixed wide display or try to detect. 
        // Since we don't have active terminal width in `Prompt` base (it uses stdout columns if available),
        // we can access process.stdout.columns.
        const termWidth = process.stdout.columns || 80;
        const colWidth = Math.floor((termWidth - 6) / 2); // 6 for padding/border

        // Adjust Scroll Top
        if (this.activeSide === 'left') {
            if (this.cursorLeft < this.scrollTopLeft) this.scrollTopLeft = this.cursorLeft;
            if (this.cursorLeft >= this.scrollTopLeft + this.pageSize) this.scrollTopLeft = this.cursorLeft - this.pageSize + 1;
        } else {
            if (this.cursorRight < this.scrollTopRight) this.scrollTopRight = this.cursorRight;
            if (this.cursorRight >= this.scrollTopRight + this.pageSize) this.scrollTopRight = this.cursorRight - this.pageSize + 1;
        }

        let output = `${theme.success}?${ANSI.RESET} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET}\n`;
        
        // Headers
        const leftTitle = this.activeSide === 'left' ? `${theme.main}Source${ANSI.RESET}` : 'Source';
        const rightTitle = this.activeSide === 'right' ? `${theme.main}Target${ANSI.RESET}` : 'Target';
        
        // Pad headers
        output += `  ${leftTitle}`.padEnd(colWidth + 2) + '   ' + `  ${rightTitle}\n`;
        output += `  ${ANSI.DIM}${symbols.line.repeat(colWidth)}${ANSI.RESET}   ${ANSI.DIM}${symbols.line.repeat(colWidth)}${ANSI.RESET}\n`;

        for (let i = 0; i < this.pageSize; i++) {
            const idxLeft = this.scrollTopLeft + i;
            const idxRight = this.scrollTopRight + i;
            
            const itemLeft = this.leftList[idxLeft];
            const itemRight = this.rightList[idxRight];

            // Left Column
            let leftStr = '';
            if (itemLeft) {
                const isSelected = this.activeSide === 'left' && idxLeft === this.cursorLeft;
                const title = this.truncate(itemLeft.title, colWidth - 2);
                if (isSelected) {
                    leftStr = `${theme.main}${symbols.pointer} ${title}${ANSI.RESET}`;
                } else {
                    leftStr = `  ${title}`;
                }
            } else {
                leftStr = ' '.repeat(colWidth); // Empty line placeholder logic? No, just empty.
            }

            // Right Column
            let rightStr = '';
            if (itemRight) {
                const isSelected = this.activeSide === 'right' && idxRight === this.cursorRight;
                const title = this.truncate(itemRight.title, colWidth - 2);
                if (isSelected) {
                    rightStr = `${theme.main}${symbols.pointer} ${title}${ANSI.RESET}`;
                } else {
                    rightStr = `  ${title}`;
                }
            }
            
            // Pad Left Str to align right column
            // We need visual width, not string length due to ANSI codes.
            // But stripping ansi is expensive in loop.
            // Since we constructed leftStr, we know if it has ANSI or not.
            // If selected: 2 chars pointer + title + reset = visual width is 2 + width(title)
            // If not: 2 spaces + title
            
            const leftVisualWidth = itemLeft ? (stringWidth(this.truncate(itemLeft.title, colWidth - 2)) + 2) : colWidth;
            const padding = ' '.repeat(Math.max(0, colWidth - leftVisualWidth));
            
            output += leftStr + padding + ' | ' + rightStr + '\n';
        }

        // Instructions
        output += `\n${ANSI.DIM}(Tab: Switch | Space: Move | Enter: Submit)${ANSI.RESET}`;

        this.renderFrame(output);
    }

    protected handleInput(char: string) {
        if (char === '\r' || char === '\n') {
             // Submit
             const leftValues = this.leftList.map(i => i.value);
             const rightValues = this.rightList.map(i => i.value);
             this.submit([leftValues, rightValues]);
             return;
        }

        if (char === '\t' || this.isLeft(char) || this.isRight(char)) {
            // Toggle side
            this.activeSide = this.activeSide === 'left' ? 'right' : 'left';
            this.render(false);
            return;
        }

        if (this.isUp(char)) {
            if (this.activeSide === 'left') {
                this.cursorLeft = Math.max(0, this.cursorLeft - 1);
            } else {
                this.cursorRight = Math.max(0, this.cursorRight - 1);
            }
            this.render(false);
            return;
        }

        if (this.isDown(char)) {
            if (this.activeSide === 'left') {
                this.cursorLeft = Math.min(this.leftList.length - 1, this.cursorLeft + 1);
            } else {
                this.cursorRight = Math.min(this.rightList.length - 1, this.cursorRight + 1);
            }
            this.render(false);
            return;
        }

        if (char === ' ') {
            // Move item
            if (this.activeSide === 'left') {
                if (this.leftList.length > 0) {
                    const [item] = this.leftList.splice(this.cursorLeft, 1);
                    this.rightList.push(item);
                    // Adjust cursor
                    if (this.cursorLeft >= this.leftList.length) {
                        this.cursorLeft = Math.max(0, this.leftList.length - 1);
                    }
                }
            } else {
                 if (this.rightList.length > 0) {
                    const [item] = this.rightList.splice(this.cursorRight, 1);
                    this.leftList.push(item);
                    // Adjust cursor
                    if (this.cursorRight >= this.rightList.length) {
                        this.cursorRight = Math.max(0, this.rightList.length - 1);
                    }
                }
            }
            this.render(false);
        }
    }

    protected handleMouse(event: MouseEvent) {
         if (event.action === 'scroll') {
            if (event.scroll === 'up') {
                if (this.activeSide === 'left') {
                     this.cursorLeft = Math.max(0, this.cursorLeft - 1);
                } else {
                     this.cursorRight = Math.max(0, this.cursorRight - 1);
                }
            } else {
                if (this.activeSide === 'left') {
                     this.cursorLeft = Math.min(this.leftList.length - 1, this.cursorLeft + 1);
                } else {
                     this.cursorRight = Math.min(this.rightList.length - 1, this.cursorRight + 1);
                }
            }
            this.render(false);
        }
    }
}
