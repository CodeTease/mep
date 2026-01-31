import { Prompt } from '../base';
import { SeatOptions, MouseEvent } from '../types';
import { ANSI } from '../ansi';
import { theme } from '../theme';

interface SeatNode {
    x: number;
    y: number;
    char: string;
    label: string;
    selectable: boolean; // Is it a seat (not a gap)?
    status: 'available' | 'occupied' | 'selected';
}

export class SeatPrompt extends Prompt<string[], SeatOptions> {
    private grid: SeatNode[][] = [];
    private cursorX: number = 0;
    private cursorY: number = 0;
    private selected: Set<string> = new Set();
    
    private height: number = 0;
    private width: number = 0;
    private initializedCursor = false;

    constructor(options: SeatOptions) {
        super(options);
        this.parseLayout();
        if (options.initial) {
            options.initial.forEach(id => this.selected.add(id));
        }
        this.checkWindowsAttention();
    }

    private parseLayout() {
        this.height = this.options.layout.length;
        this.width = 0;
        
        this.grid = this.options.layout.map((line, y) => {
            if (line.length > this.width) this.width = line.length;
            
            return line.split('').map((char, x) => {
                const isGap = char === '_' || char === ' ';
                // Convention: 'X' is occupied.
                const isOccupied = char.toUpperCase() === 'X';
                
                // Label generation: Rows (A, B...), Cols (1, 2...)
                const rowLabel = this.options.rows ? (this.options.rows[y] || String(y + 1)) : String.fromCharCode(65 + y);
                const colLabel = this.options.cols ? (this.options.cols[x] || String(x + 1)) : String(x + 1);
                
                const label = `${rowLabel}${colLabel}`;
                
                const selectable = !isGap; 
                let status: SeatNode['status'] = 'available';
                
                if (isOccupied) status = 'occupied';
                if (this.selected.has(label)) status = 'selected'; // Though this is dynamic state
                
                // Initialize cursor to first available seat
                if (selectable && status !== 'occupied' && !this.initializedCursor) {
                    this.cursorX = x;
                    this.cursorY = y;
                    this.initializedCursor = true;
                }
                
                return {
                    x, y, char, label, selectable, status
                };
            });
        });
    }

    protected render(_firstRender: boolean) {
        let output = `${theme.title}${this.options.message}${ANSI.RESET}\n`;
        output += `${theme.muted}(Use arrows to move, Space to select, Enter to confirm)${ANSI.RESET}\n\n`;

        this.grid.forEach((row, y) => {
            let lineStr = '';
            row.forEach((node, x) => {
                const isCursor = x === this.cursorX && y === this.cursorY;
                const isSelected = this.selected.has(node.label);
                
                const charDisplay = node.char;
                // If occupied, maybe show a different char or color
                
                let style = ANSI.RESET;
                
                if (node.status === 'occupied') {
                     style = ANSI.FG_RED;
                } else if (!node.selectable) {
                     style = theme.muted;
                } else {
                     style = theme.main; // Available seats
                }

                if (isSelected) {
                    style = ANSI.BG_GREEN + ANSI.FG_BLACK;
                }
                
                if (isCursor) {
                    // Combine styles? Cursor overrides everything usually
                    style = ANSI.BG_CYAN + ANSI.FG_BLACK;
                }

                lineStr += style + charDisplay + ANSI.RESET + ' ';
            });
            output += lineStr + '\n';
        });

        // Show Legend or Current Selection
        if (this.selected.size > 0) {
            output += `\n${theme.success}Selected: ${Array.from(this.selected).join(', ')}${ANSI.RESET}`;
        }

        this.renderFrame(output);
    }

    protected handleInput(char: string) {
        if (char === '\r' || char === '\n') {
            this.submit(Array.from(this.selected));
            return;
        }

        if (char === ' ') {
            const row = this.grid[this.cursorY];
            if (!row) return;
            const node = row[this.cursorX];
            
            if (node && node.selectable && node.status !== 'occupied') {
                if (this.selected.has(node.label)) {
                    this.selected.delete(node.label);
                } else {
                    if (!this.options.multiple) this.selected.clear();
                    this.selected.add(node.label);
                }
                this.render(false);
            }
            return;
        }

        if (this.isUp(char)) this.move(0, -1);
        else if (this.isDown(char)) this.move(0, 1);
        else if (this.isLeft(char)) this.move(-1, 0);
        else if (this.isRight(char)) this.move(1, 0);
        
        // Tab / Shift+Tab
        else if (char === '\t') this.move(1, 0);
        else if (char === '\u001b[Z') this.move(-1, 0);
    }

    protected handleMouse(event: MouseEvent) {
        if (event.action === 'scroll') {
            if (event.scroll === 'up') this.move(0, -1);
            else if (event.scroll === 'down') this.move(0, 1);
        }
    }

    private move(dx: number, dy: number) {
        let nx = this.cursorX;
        let ny = this.cursorY;
        let limit = Math.max(this.width, this.height) + 10;
        
        do {
            nx += dx;
            ny += dy;
            limit--;
            
            // Boundary Check
            if (ny < 0 || ny >= this.height) return;
            const row = this.grid[ny];
            if (!row) return;
            if (nx < 0 || nx >= row.length) return;
            
            const node = row[nx];
            // Stop if node is selectable (seat or occupied seat)
            // Skip gaps ('_' or ' ')
            if (node.selectable) {
                this.cursorX = nx;
                this.cursorY = ny;
                this.render(false);
                return;
            }
            
        } while (limit > 0);
    }
}
