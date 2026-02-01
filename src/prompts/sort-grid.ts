import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { SortGridOptions, MouseEvent } from '../types';
import { stringWidth } from '../utils';

export class SortGridPrompt extends Prompt<string[][], SortGridOptions> {
    protected cursorX: number = 0;
    protected cursorY: number = 0;
    protected grabbedX: number | null = null;
    protected grabbedY: number | null = null;
    private gridData: string[][];
    private columnWidths: number[] = [];

    constructor(options: SortGridOptions) {
        super(options);
        // Deep copy grid data
        this.gridData = options.data.map(row => [...row]);
        this.calculateLayout();
    }

    private calculateLayout() {
        const rows = this.gridData.length;
        if (rows === 0) return;
        // Assume consistent column count, use max found if ragged
        const cols = this.gridData.reduce((max, row) => Math.max(max, row.length), 0);
        
        this.columnWidths = new Array(cols).fill(0);
        
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < this.gridData[r].length; c++) {
                const cell = this.gridData[r][c] || '';
                this.columnWidths[c] = Math.max(this.columnWidths[c], stringWidth(cell) + 2); // +2 padding
            }
        }
    }

    protected render(_firstRender: boolean): void {
        this.calculateLayout();
        let output = `${theme.title}${this.options.message}${ANSI.RESET}\n`;

        this.gridData.forEach((row, r) => {
            const rowStr = row.map((cell, c) => {
                const width = this.columnWidths[c] || stringWidth(cell) + 2;
                const content = cell || '';
                
                // Padding
                const padding = Math.max(0, width - stringWidth(content));
                const leftPad = Math.floor(padding / 2);
                const rightPad = padding - leftPad;
                
                let cellStr = ' '.repeat(leftPad) + content + ' '.repeat(rightPad);

                // Styling
                const isFocused = (r === this.cursorY && c === this.cursorX);
                const isGrabbed = (r === this.grabbedY && c === this.grabbedX);

                if (isGrabbed) {
                    // Grabbed item style
                    cellStr = `${ANSI.BG_RED}${ANSI.FG_WHITE}${cellStr}${ANSI.RESET}`;
                } else if (isFocused) {
                    // Focused item style
                    cellStr = `${ANSI.REVERSE}${cellStr}${ANSI.RESET}`;
                }
                
                return cellStr;
            }).join(' '); // Space between columns
            
            output += rowStr + '\n';
        });

        output += `${theme.muted}Arrows to move, Space to grab/drop, Enter to submit${ANSI.RESET}`;
        this.renderFrame(output);
    }

    protected handleInput(char: string, _key: Buffer): void {
        if (char === '\r' || char === '\n') {
            if (this.grabbedX !== null) {
                this.grabbedX = null;
                this.grabbedY = null;
            }
            this.submit(this.gridData);
            return;
        }

        if (char === ' ') {
            if (this.grabbedX === null) {
                // Grab
                this.grabbedX = this.cursorX;
                this.grabbedY = this.cursorY;
            } else {
                // Drop
                this.grabbedX = null;
                this.grabbedY = null;
            }
            this.render(false);
            return;
        }

        const isUp = this.isUp(char);
        const isDown = this.isDown(char);
        const isLeft = this.isLeft(char);
        const isRight = this.isRight(char);
        const isTab = char === '\t';
        const isShiftTab = char === '\u001b[Z';
        
        if (isUp) this.move('up');
        if (isDown) this.move('down');
        if (isLeft || isShiftTab) this.move('left');
        if (isRight || isTab) this.move('right');
    }

    protected handleMouse(event: MouseEvent): void {
        if (event.scroll === 'up') {
            this.move('up');
        } else if (event.scroll === 'down') {
            this.move('down');
        }
    }

    protected move(direction: 'up' | 'down' | 'left' | 'right'): void {
        if (this.gridData.length === 0) return;

        const oldX = this.cursorX;
        const oldY = this.cursorY;
        
        if (direction === 'up') this.cursorY = Math.max(0, this.cursorY - 1);
        if (direction === 'down') this.cursorY = Math.min(this.gridData.length - 1, this.cursorY + 1);
        
        // Clamp cursorX if we moved to a shorter row
        if (this.gridData.length > 0) {
             const rowLen = this.gridData[this.cursorY] ? this.gridData[this.cursorY].length : 0;
             if (this.cursorX >= rowLen) this.cursorX = Math.max(0, rowLen - 1);
        }

        if (direction === 'left') this.cursorX = Math.max(0, this.cursorX - 1);
        if (direction === 'right') {
            const rowLen = this.gridData.length > 0 && this.gridData[this.cursorY] ? this.gridData[this.cursorY].length : 0;
            this.cursorX = Math.min(rowLen - 1, this.cursorX + 1);
        }

        // If Grabbed, swap content
        if (this.grabbedX !== null) {
            // If we moved
            if (oldX !== this.cursorX || oldY !== this.cursorY) {
                const valA = this.gridData[oldY][oldX];
                const valB = this.gridData[this.cursorY][this.cursorX];
                
                this.gridData[oldY][oldX] = valB;
                this.gridData[this.cursorY][this.cursorX] = valA;
                
                this.grabbedX = this.cursorX;
                this.grabbedY = this.cursorY;
            }
        }
        
        this.render(false);
    }
}
