import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { GridOptions, MouseEvent } from '../types';
import { stringWidth } from '../utils';

export class GridPrompt extends Prompt<boolean[][], GridOptions> {
    private cursorRow: number = 0;
    private cursorCol: number = 0;
    private selected: boolean[][];
    private columnWidths: number[] = [];
    private rowLabelWidth: number = 0;

    constructor(options: GridOptions) {
        super(options);
        // Initialize selection matrix
        if (options.initial) {
            this.selected = options.initial.map(row => [...row]);
        } else {
            this.selected = options.rows.map(() => 
                new Array(options.columns.length).fill(false)
            );
        }
        
        this.calculateLayout();
    }
    
    private calculateLayout() {
        // Calculate max width for row labels
        this.rowLabelWidth = 0;
        for (const row of this.options.rows) {
            this.rowLabelWidth = Math.max(this.rowLabelWidth, stringWidth(row));
        }
        
        // Calculate width for each column
        this.columnWidths = this.options.columns.map(col => {
            // Header width vs Cell width (3 chars for "[ ]")
            return Math.max(stringWidth(col), 3);
        });
    }

    protected render(firstRender: boolean): void {
        const { rows, columns } = this.options;
        
        let output = `${theme.title}${this.options.message}${ANSI.RESET}\n`;
        
        // Render Header
        // Padding for the row label column
        output += ' '.repeat(this.rowLabelWidth + 2); // +2 for spacing/border
        
        output += columns.map((col, i) => {
            const width = this.columnWidths[i];
            const padding = width - stringWidth(col);
            const leftPad = Math.floor(padding / 2);
            const rightPad = padding - leftPad;
            return `${theme.muted}${' '.repeat(leftPad)}${col}${' '.repeat(rightPad)}${ANSI.RESET}`;
        }).join('  ') + '\n';
        
        // Render Rows
        for (let r = 0; r < rows.length; r++) {
            const rowLabel = rows[r];
            const labelPadding = this.rowLabelWidth - stringWidth(rowLabel);
            
            // Row Label
            output += `${theme.muted}${rowLabel}${' '.repeat(labelPadding)}${ANSI.RESET}  `;
            
            // Cells
            const cells = this.selected[r].map((isChecked, c) => {
                const isFocused = (r === this.cursorRow && c === this.cursorCol);
                const width = this.columnWidths[c];
                const content = isChecked ? `[${theme.success}x${ANSI.RESET}]` : '[ ]';
                // content string width is 3 (ignoring ansi)
                const padding = width - 3;
                const leftPad = Math.floor(padding / 2);
                const rightPad = padding - leftPad;
                
                let cellStr = `${' '.repeat(leftPad)}${content}${' '.repeat(rightPad)}`;
                
                if (isFocused) {
                    // Highlight the focused cell
                    // If we use ANSI.REVERSE on the whole cell including padding:
                    cellStr = `${ANSI.REVERSE}${cellStr}${ANSI.RESET}`;
                }
                
                return cellStr;
            });
            
            output += cells.join('  ') + '\n';
        }

        output += `${theme.muted}Arrows to move, Space to toggle, Enter to submit${ANSI.RESET}`;

        this.renderFrame(output);
    }

    protected handleInput(char: string, key: Buffer): void {
        const isUp = this.isUp(char);
        const isDown = this.isDown(char);
        const isLeft = this.isLeft(char);
        const isRight = this.isRight(char);
        
        if (isUp || isDown || isLeft || isRight) {
            if (isUp) this.cursorRow = Math.max(0, this.cursorRow - 1);
            if (isDown) this.cursorRow = Math.min(this.options.rows.length - 1, this.cursorRow + 1);
            if (isLeft) this.cursorCol = Math.max(0, this.cursorCol - 1);
            if (isRight) this.cursorCol = Math.min(this.options.columns.length - 1, this.cursorCol + 1);
            
            this.render(false);
            return;
        }
        
        if (char === ' ') {
            this.selected[this.cursorRow][this.cursorCol] = !this.selected[this.cursorRow][this.cursorCol];
            this.render(false);
            return;
        }
        
        if (char === '\r' || char === '\n') {
            this.submit(this.selected);
            return;
        }

        // PageUp (First Row)
        if (char === '\x1b[5~') {
            this.cursorRow = 0;
            this.render(false);
            return;
        }
        // PageDown (Last Row)
        if (char === '\x1b[6~') {
            this.cursorRow = this.options.rows.length - 1;
            this.render(false);
            return;
        }
        // Home (First Column)
        if (char === '\x1b[H' || char === '\x1b[1~') {
            this.cursorCol = 0;
            this.render(false);
            return;
        }
        // End (Last Column)
        if (char === '\x1b[F' || char === '\x1b[4~') {
            this.cursorCol = this.options.columns.length - 1;
            this.render(false);
            return;
        }

        // r: Toggle Row
        if (char === 'r') {
             const row = this.selected[this.cursorRow];
             const allSelected = row.every(c => c);
             this.selected[this.cursorRow] = row.map(() => !allSelected);
             this.render(false);
             return;
        }

        // c: Toggle Column
        if (char === 'c') {
             const colIdx = this.cursorCol;
             const colValues = this.selected.map(row => row[colIdx]);
             const allSelected = colValues.every(c => c);
             this.selected.forEach(row => row[colIdx] = !allSelected);
             this.render(false);
             return;
        }

        // a: Select All
        if (char === 'a') {
             this.selected = this.selected.map(row => row.map(() => true));
             this.render(false);
             return;
        }

        // x: Deselect All
        if (char === 'x') {
             this.selected = this.selected.map(row => row.map(() => false));
             this.render(false);
             return;
        }

        // i: Invert
        if (char === 'i') {
             this.selected = this.selected.map(row => row.map(v => !v));
             this.render(false);
             return;
        }
    }

    protected handleMouse(event: MouseEvent): void {
        if (event.action === 'scroll') {
            const direction = event.scroll === 'up' ? -1 : 1;
            
            if (event.shift) {
                // Horizontal (Column)
                this.cursorCol = Math.max(0, Math.min(this.options.columns.length - 1, this.cursorCol + direction));
            } else {
                // Vertical (Row)
                this.cursorRow = Math.max(0, Math.min(this.options.rows.length - 1, this.cursorRow + direction));
            }
            this.render(false);
        }
    }
}
