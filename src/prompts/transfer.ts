import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { symbols } from '../symbols';
import { theme } from '../theme';
import type { MouseEvent, SelectChoice, TransferOptions } from '../types';
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
        return items.map((item) => {
            if (typeof item === 'string') {
                return { title: item, value: item as unknown as V };
            }
            return item;
        });
    }

    protected truncate(str: string, width: number): string {
        if (stringWidth(str) <= width) return str;
        let res = str;
        while (stringWidth(res + '...') > width && res.length > 0) {
            res = res.slice(0, -1);
        }
        return res + '...';
    }

    /**
     * Keeps a list cursor inside `[0, length - 1]`, or at 0 when the list is
     * empty. An out-of-range cursor would otherwise make `splice` remove the
     * wrong item, or none at all.
     */
    private clampCursor(cursor: number, length: number): number {
        if (length === 0) return 0;
        return Math.max(0, Math.min(cursor, length - 1));
    }

    protected render(_firstRender: boolean) {
        const termWidth = process.stdout.columns || 80;
        const colWidth = Math.floor((termWidth - 6) / 2);

        // Repair the cursors of both sides: items can be moved out of a list by
        // a batch shortcut, leaving the cursor past the end (or at -1).
        this.cursorLeft = this.clampCursor(this.cursorLeft, this.leftList.length);
        this.cursorRight = this.clampCursor(this.cursorRight, this.rightList.length);

        // Adjust Scroll Top
        if (this.activeSide === 'left') {
            if (this.cursorLeft < this.scrollTopLeft) this.scrollTopLeft = this.cursorLeft;
            if (this.cursorLeft >= this.scrollTopLeft + this.pageSize)
                this.scrollTopLeft = this.cursorLeft - this.pageSize + 1;
        } else {
            if (this.cursorRight < this.scrollTopRight) this.scrollTopRight = this.cursorRight;
            if (this.cursorRight >= this.scrollTopRight + this.pageSize)
                this.scrollTopRight = this.cursorRight - this.pageSize + 1;
        }

        let output = `${theme.success}?${ANSI.RESET} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET}\n`;

        // Headers
        const leftTitle = this.activeSide === 'left' ? `${theme.main}Source${ANSI.RESET}` : 'Source';
        const rightTitle = this.activeSide === 'right' ? `${theme.main}Target${ANSI.RESET}` : 'Target';

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
                leftStr = ''; // Empty
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

            const leftVisualWidth = itemLeft ? stringWidth(this.truncate(itemLeft.title, colWidth - 2)) + 2 : 0;
            // Pad visually
            const padding = ' '.repeat(Math.max(0, colWidth - leftVisualWidth));

            output += leftStr + padding + ' | ' + rightStr + '\n';
        }

        output += `\n${ANSI.DIM}(Tab: Switch | a: Move All Right | r: Reset/All Left)${ANSI.RESET}`;

        this.renderFrame(output);
    }

    protected handleInput(char: string) {
        if (char === '\r' || char === '\n') {
            const leftValues = this.leftList.map((i) => i.value);
            const rightValues = this.rightList.map((i) => i.value);
            this.submit([leftValues, rightValues]);
            return;
        }

        if (char === '\t' || this.isLeft(char) || this.isRight(char)) {
            // Toggle side
            this.activeSide = this.activeSide === 'left' ? 'right' : 'left';
            this.render(false);
            return;
        }

        // --- Batch Transfer Shortcuts ---

        // Move All to Right ('a' or '>')
        if (char === 'a' || char === '>') {
            if (this.leftList.length > 0) {
                this.rightList.push(...this.leftList);
                this.leftList = [];
                this.cursorLeft = 0;
                this.cursorRight = this.clampCursor(this.cursorRight, this.rightList.length);
                this.activeSide = 'right';
                this.render(false);
            }
            return;
        }

        // Move All to Left ('r' or '<')
        if (char === 'r' || char === '<') {
            if (this.rightList.length > 0) {
                this.leftList.push(...this.rightList);
                this.rightList = [];
                this.cursorRight = 0;
                this.cursorLeft = this.clampCursor(this.cursorLeft, this.leftList.length);
                this.activeSide = 'left';
                this.render(false);
            }
            return;
        }

        if (this.isUp(char)) {
            if (this.activeSide === 'left') {
                this.cursorLeft = this.clampCursor(this.cursorLeft - 1, this.leftList.length);
            } else {
                this.cursorRight = this.clampCursor(this.cursorRight - 1, this.rightList.length);
            }
            this.render(false);
            return;
        }

        if (this.isDown(char)) {
            if (this.activeSide === 'left') {
                this.cursorLeft = this.clampCursor(this.cursorLeft + 1, this.leftList.length);
            } else {
                this.cursorRight = this.clampCursor(this.cursorRight + 1, this.rightList.length);
            }
            this.render(false);
            return;
        }

        if (char === ' ') {
            // Move item. The cursor is repaired first so an empty list or a
            // stale position can never splice an unrelated entry.
            if (this.activeSide === 'left') {
                this.cursorLeft = this.clampCursor(this.cursorLeft, this.leftList.length);
                if (this.leftList.length > 0) {
                    const [item] = this.leftList.splice(this.cursorLeft, 1);
                    this.rightList.push(item);
                    this.cursorLeft = this.clampCursor(this.cursorLeft, this.leftList.length);
                }
            } else {
                this.cursorRight = this.clampCursor(this.cursorRight, this.rightList.length);
                if (this.rightList.length > 0) {
                    const [item] = this.rightList.splice(this.cursorRight, 1);
                    this.leftList.push(item);
                    this.cursorRight = this.clampCursor(this.cursorRight, this.rightList.length);
                }
            }
            this.render(false);
        }
    }

    protected handleMouse(event: MouseEvent) {
        if (event.action === 'scroll') {
            if (event.scroll === 'up') {
                if (this.activeSide === 'left') {
                    this.cursorLeft = this.clampCursor(this.cursorLeft - 1, this.leftList.length);
                } else {
                    this.cursorRight = this.clampCursor(this.cursorRight - 1, this.rightList.length);
                }
            } else {
                if (this.activeSide === 'left') {
                    this.cursorLeft = this.clampCursor(this.cursorLeft + 1, this.leftList.length);
                } else {
                    this.cursorRight = this.clampCursor(this.cursorRight + 1, this.rightList.length);
                }
            }
            this.render(false);
        }
    }
}
