import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { symbols } from '../symbols';
import { SpreadsheetOptions, MouseEvent } from '../types';
import { stringWidth } from '../utils';

export class SpreadsheetPrompt extends Prompt<Record<string, any>[], SpreadsheetOptions> {
    private cursorRow: number = 0;
    private cursorCol: number = 0;
    private scrollRow: number = 0;
    private scrollCol: number = 0;
    
    private editMode: boolean = false;
    private tempValue: string = '';
    
    private colWidths: number[] = [];
    private viewportHeight: number;

    constructor(options: SpreadsheetOptions) {
        super(options);
        this.viewportHeight = options.rows || 10;
        this.calculateColWidths();
    }

    private calculateColWidths() {
        this.colWidths = this.options.columns.map(col => {
            if (col.width) return col.width;
            
            // Auto calculate based on header and data
            let max = stringWidth(col.name);
            this.options.data.forEach(row => {
                const val = String(row[col.key] || '');
                max = Math.max(max, stringWidth(val));
            });
            return Math.min(max + 2, 30); // Cap at 30 chars
        });
    }

    protected render(firstRender: boolean) {
        let output = '';

        // Title
        const mode = this.editMode ? `${ANSI.FG_YELLOW}[EDIT]${ANSI.RESET}` : `${ANSI.FG_BLUE}[NAV]${ANSI.RESET}`;
        output += `${theme.title}${this.options.message} ${mode}${ANSI.RESET}\n`;

        output += `${ANSI.DIM}(Arrows: Move, Enter/Type: Edit, Esc: Cancel)${ANSI.RESET}\n`;

        // Viewport Logic (Rows)
        const maxScrollRow = Math.max(0, this.options.data.length - this.viewportHeight);
        if (this.cursorRow < this.scrollRow) this.scrollRow = this.cursorRow;
        if (this.cursorRow >= this.scrollRow + this.viewportHeight) this.scrollRow = this.cursorRow - this.viewportHeight + 1;
        this.scrollRow = Math.min(maxScrollRow, this.scrollRow);

        // Viewport Logic (Columns - Horizontal Scroll)
        const termWidth = this.stdout.columns || 80;
        let currentWidth = 4; // Row number column (3 digits + space)
        const visibleCols: number[] = [];
        
        for (let i = this.scrollCol; i < this.options.columns.length; i++) {
            const w = this.colWidths[i];
            // Check if adding this column exceeds width
            // We allow at least one column even if it exceeds? No, standard behavior.
            if (currentWidth + w + 1 > termWidth && visibleCols.length > 0) break;
            
            visibleCols.push(i);
            currentWidth += w + 1;
        }

        // Render Header
        let headerStr = '   '; 
        let totalWidth = 3;
        
        visibleCols.forEach(idx => {
             const col = this.options.columns[idx];
             const w = this.colWidths[idx];
             headerStr += this.pad(col.name, w) + ' ';
             totalWidth += w + 1;
        });
        
        output += `${ANSI.BOLD}${headerStr}${ANSI.RESET}\n`;
        output += `${ANSI.DIM}   ${symbols.horizontal.repeat(Math.max(0, totalWidth - 3))}${ANSI.RESET}\n`;

        // Render Rows
        for (let i = 0; i < this.viewportHeight; i++) {
            const rowIndex = this.scrollRow + i;
            if (rowIndex >= this.options.data.length) break;
            
            const rowData = this.options.data[rowIndex];
            // Row Number
            let rowStr = `${ANSI.DIM}${String(rowIndex + 1).padEnd(3)}${ANSI.RESET}`;
            
            visibleCols.forEach(colIndex => {
                const col = this.options.columns[colIndex];
                const w = this.colWidths[colIndex];
                const isCursor = (rowIndex === this.cursorRow) && (colIndex === this.cursorCol);
                
                let val = String(rowData[col.key] || '');
                if (isCursor && this.editMode) {
                    val = this.tempValue;
                }
                
                let displayVal = this.truncate(val, w);
                displayVal = this.pad(displayVal, w);
                
                if (isCursor) {
                    if (this.editMode) {
                         // Highlight editing
                         displayVal = `${theme.main}${ANSI.UNDERLINE}${displayVal}${ANSI.RESET}`;
                    } else {
                         // Highlight selection
                         displayVal = `${ANSI.REVERSE}${displayVal}${ANSI.RESET}`;
                    }
                }
                
                rowStr += displayVal + ' ';
            });
            output += rowStr + '\n';
        }

        // Footer / Status
        if (this.editMode) {
            output += `\n${ANSI.FG_YELLOW}Editing cell (${this.cursorRow+1}, ${this.options.columns[this.cursorCol].name}). Press Enter to save.${ANSI.RESET}`;
        } else {
             output += `\n${ANSI.DIM}Press 's' or Enter to Save & Exit${ANSI.RESET}`;
        }

        this.renderFrame(output);
    }

    private pad(str: string, width: number): string {
        const w = stringWidth(str);
        if (w >= width) return str;
        return str + ' '.repeat(width - w);
    }
    
    protected handleInput(char: string, _key: Buffer) {
        if (this.editMode) {
            this.handleEditInput(char);
        } else {
            this.handleNavInput(char);
        }
    }

    private handleNavInput(char: string) {
        // Navigation
        if (this.isUp(char)) {
            this.cursorRow = Math.max(0, this.cursorRow - 1);
            this.render(false);
            return;
        }
        if (this.isDown(char)) {
            this.cursorRow = Math.min(this.options.data.length - 1, this.cursorRow + 1);
            this.render(false);
            return;
        }
        if (this.isLeft(char) || char === '\x1b[Z') {
            this.cursorCol = Math.max(0, this.cursorCol - 1);
            if (this.cursorCol < this.scrollCol) {
                this.scrollCol = this.cursorCol;
            }
            this.render(false);
            return;
        }
        if (this.isRight(char) || char === '\t') {
            this.cursorCol = Math.min(this.options.columns.length - 1, this.cursorCol + 1);
            
            // Adjust scrollCol to keep cursor visible
            // Loop until cursorCol is within visible range
            while (true) {
                 const termWidth = this.stdout.columns || 80;
                 let w = 4; // Row num
                 let isVisible = false;
                 
                 for (let i = this.scrollCol; i < this.options.columns.length; i++) {
                     w += this.colWidths[i] + 1;
                     if (w > termWidth && i > this.scrollCol) break; // Allow at least one
                     
                     if (i === this.cursorCol) {
                         isVisible = true;
                         break;
                     }
                 }
                 
                 if (isVisible) break;
                 this.scrollCol++;
                 if (this.scrollCol > this.cursorCol) {
                     this.scrollCol = this.cursorCol;
                     break;
                 }
            }
            
            this.render(false);
            return;
        }

        // Enter Edit Mode
        if (char === '\r' || char === '\n') {
            this.startEditing();
            return;
        }

        // Shortcuts
        if (char === 's') {
            this.submit(this.options.data);
            return;
        }
        
        // Removed 'q' unsafe exit.
        
        // Typing starts editing
        if (!/^[\x00-\x1F]/.test(char)) {
            this.startEditing(char);
        }
    }

    private startEditing(initialChar: string = '') {
        const col = this.options.columns[this.cursorCol];
        if (col.editable === false) return;

        this.editMode = true;
        const currentVal = String(this.options.data[this.cursorRow][col.key] || '');
        this.tempValue = initialChar ? initialChar : currentVal;
        this.render(false);
    }

    private handleEditInput(char: string) {
        if (char === '\r' || char === '\n') {
            // Save
            const col = this.options.columns[this.cursorCol];
            this.options.data[this.cursorRow][col.key] = this.tempValue;
            this.editMode = false;
            // Recalculate width if needed?
            this.calculateColWidths(); // Update widths
            this.render(false);
            return;
        }

        if (char === '\x1b') { // Esc
            this.editMode = false;
            this.render(false);
            return;
        }

        if (char === '\x7f' || char === '\b') {
            this.tempValue = this.tempValue.slice(0, -1);
            this.render(false);
            return;
        }

        if (!/^[\x00-\x1F]/.test(char)) {
            this.tempValue += char;
            this.render(false);
        }
    }

    protected handleMouse(event: MouseEvent) {
        if (event.action === 'scroll') {
             if (event.scroll === 'up') {
                this.cursorRow = Math.max(0, this.cursorRow - 1);
                this.render(false);
            } else {
                 this.cursorRow = Math.min(this.options.data.length - 1, this.cursorRow + 1);
                 this.render(false);
            }
        }
    }
}
