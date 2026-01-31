import { Prompt } from '../base';
import { HeatmapOptions, HeatmapLegend, MouseEvent } from '../types';
import { ANSI } from '../ansi';

export class HeatmapPrompt extends Prompt<number[][], HeatmapOptions> {
    private grid: number[][];
    private cursorRow: number = 0;
    private cursorCol: number = 0;
    private validValues: number[];

    constructor(options: HeatmapOptions) {
        super(options);
        // Initialize grid
        const rows = options.rows.length;
        const cols = options.columns.length;
        if (options.initial) {
            this.grid = options.initial.map(row => [...row]);
        } else {
            this.grid = Array.from({ length: rows }, () => Array(cols).fill(0));
        }

        // Get sorted valid values for cycling
        this.validValues = options.legend.map(l => l.value).sort((a, b) => a - b);
    }

    protected render(firstRender: boolean): void {
        let output = `${ANSI.FG_CYAN}? ${this.options.message}${ANSI.RESET}\n`;
        
        // Render Column Headers
        output += '     '; // Offset for row labels
        this.options.columns.forEach(col => {
            // Show first 2 chars
            const label = col.substring(0, 2).padEnd(2);
            output += ` ${label} `;
        });
        output += '\n';

        // Grid
        for (let r = 0; r < this.options.rows.length; r++) {
            const rowLabel = this.options.rows[r].substring(0, 4).padStart(4);
            output += `${ANSI.FG_GRAY}${rowLabel} ${ANSI.RESET}`;

            for (let c = 0; c < this.options.columns.length; c++) {
                const val = this.grid[r][c];
                const legend = this.getLegend(val);
                const char = legend?.char || '?';
                const color = legend?.color || ((s: string) => s);
                
                const isCursor = r === this.cursorRow && c === this.cursorCol;
                
                let cellContent = color(char);
                if (isCursor) {
                    output += `[${cellContent}]`; // Brackets around
                } else {
                    output += ` ${cellContent} `;
                }
            }
            output += '\n';
        }

        // Legend
        output += '\nLegend: ';
        this.options.legend.forEach(l => {
             output += `${l.value}:${l.color(l.char)}  `;
        });
        output += '\n' + ANSI.FG_GRAY + "(Arrows to move, Space to cycle, 0-9 to set)" + ANSI.RESET;

        this.renderFrame(output);
    }

    private getLegend(val: number): HeatmapLegend | undefined {
        return this.options.legend.find(l => l.value === val);
    }

    protected handleMouse(event: MouseEvent): void {
        if (event.action === 'scroll') {
            if (event.scroll === 'up') {
                if (this.cursorRow > 0) this.cursorRow--;
            } else if (event.scroll === 'down') {
                if (this.cursorRow < this.options.rows.length - 1) this.cursorRow++;
            }
            this.render(false);
        }
    }

    protected handleInput(char: string, key: Buffer): void {
        if (char === '\r' || char === '\n') { // Enter
            this.submit(this.grid);
            return;
        }

        if (this.isUp(char)) {
            if (this.cursorRow > 0) this.cursorRow--;
        } else if (this.isDown(char)) {
            if (this.cursorRow < this.options.rows.length - 1) this.cursorRow++;
        } else if (this.isLeft(char)) {
            if (this.cursorCol > 0) this.cursorCol--;
        } else if (this.isRight(char)) {
            if (this.cursorCol < this.options.columns.length - 1) this.cursorCol++;
        } else if (char === '\t') { // Tab -> Right (Cycle)
             this.cursorCol++;
             if (this.cursorCol >= this.options.columns.length) {
                 this.cursorCol = 0;
                 this.cursorRow++;
                 if (this.cursorRow >= this.options.rows.length) {
                     this.cursorRow = 0;
                 }
             }
        } else if (char === '\u001b[Z') { // Shift+Tab -> Left (Cycle)
             this.cursorCol--;
             if (this.cursorCol < 0) {
                 this.cursorCol = this.options.columns.length - 1;
                 this.cursorRow--;
                 if (this.cursorRow < 0) {
                     this.cursorRow = this.options.rows.length - 1;
                 }
             }
        } else if (char === ' ') {
            const val = this.grid[this.cursorRow][this.cursorCol];
            const idx = this.validValues.indexOf(val);
            let nextVal;
            if (idx === -1) {
                // If current val not in legend (maybe init with invalid), reset to first
                nextVal = this.validValues[0];
            } else {
                nextVal = this.validValues[(idx + 1) % this.validValues.length];
            }
            this.grid[this.cursorRow][this.cursorCol] = nextVal;
        } else if (/[0-9]/.test(char)) {
            const num = parseInt(char, 10);
            // Only set if valid in legend
            if (this.validValues.includes(num)) {
                this.grid[this.cursorRow][this.cursorCol] = num;
            }
        }
        
        this.render(false);
    }
}
