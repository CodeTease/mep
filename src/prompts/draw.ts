import { Prompt } from '../base';
import { DrawOptions, MouseEvent } from '../types';
import { theme } from '../theme';
import { ANSI } from '../ansi';

export class DrawPrompt extends Prompt<string | boolean[][], DrawOptions> {
    private grid: boolean[][];
    private cursorX: number = 0;
    private cursorY: number = 0;
    private gridWidth: number;
    private gridHeight: number;
    private lastMouse: { x: number, y: number } | null = null;

    constructor(options: DrawOptions) {
        super(options);
        this.gridWidth = options.width * 2;
        this.gridHeight = options.height * 4;
        
        if (options.initial) {
             // Deep copy to avoid mutating original if passed
             this.grid = options.initial.map(row => [...row]);
        } else {
            this.grid = [];
            for (let y = 0; y < this.gridHeight; y++) {
                const row = new Array(this.gridWidth).fill(false);
                this.grid.push(row);
            }
        }
    }

    private getBrailleChar(x: number, y: number): string {
        const baseX = x * 2;
        const baseY = y * 4;
        let code = 0x2800; // Base Braille
        
        // Column 0
        if (this.getPixel(baseX, baseY)) code |= 0x1;       // Dot 1
        if (this.getPixel(baseX, baseY + 1)) code |= 0x2;   // Dot 2
        if (this.getPixel(baseX, baseY + 2)) code |= 0x4;   // Dot 3
        if (this.getPixel(baseX, baseY + 3)) code |= 0x40;  // Dot 7 (Bottom-left)
        
        // Column 1
        if (this.getPixel(baseX + 1, baseY)) code |= 0x8;       // Dot 4
        if (this.getPixel(baseX + 1, baseY + 1)) code |= 0x10;  // Dot 5
        if (this.getPixel(baseX + 1, baseY + 2)) code |= 0x20;  // Dot 6
        if (this.getPixel(baseX + 1, baseY + 3)) code |= 0x80;  // Dot 8 (Bottom-right)

        return String.fromCharCode(code);
    }

    private getPixel(x: number, y: number): boolean {
        if (y >= 0 && y < this.gridHeight && x >= 0 && x < this.gridWidth) {
            return this.grid[y][x];
        }
        return false;
    }
    
    private setPixel(x: number, y: number, val: boolean) {
        if (y >= 0 && y < this.gridHeight && x >= 0 && x < this.gridWidth) {
            this.grid[y][x] = val;
        }
    }

    protected render(firstRender: boolean) {
        let output = `${theme.title}${this.options.message}${ANSI.RESET}\n`;
        
        output += `${ANSI.FG_GRAY}┌${'─'.repeat(this.options.width + 2)}┐${ANSI.RESET}\n`;

        for (let y = 0; y < this.options.height; y++) {
            let line = '';
            for (let x = 0; x < this.options.width; x++) {
                let char = this.getBrailleChar(x, y);
                
                // Highlight cursor position (pixel level approximation)
                // If cursor is within this character block
                const containsCursor = 
                    Math.floor(this.cursorX / 2) === x && 
                    Math.floor(this.cursorY / 4) === y;

                if (containsCursor) {
                    line += ANSI.REVERSE + char + ANSI.RESET;
                } else {
                    line += char;
                }
            }
            output += `${ANSI.FG_GRAY}│ ${ANSI.RESET}${line} ${ANSI.FG_GRAY}│${ANSI.RESET}\n`;
        }
        
        output += `${ANSI.FG_GRAY}└${'─'.repeat(this.options.width + 2)}┘${ANSI.RESET}\n`;

        output += `\n${ANSI.FG_GRAY}(Arrows: move, Space: toggle, Mouse: drag, 'c': clear, 'i': invert, Enter: done)${ANSI.RESET}`;
        this.renderFrame(output);
    }

    protected handleInput(char: string, key: Buffer) {
        if (this.isLeft(char)) {
            this.cursorX = Math.max(0, this.cursorX - 1);
            this.render(false);
        } else if (this.isRight(char)) {
            this.cursorX = Math.min(this.gridWidth - 1, this.cursorX + 1);
            this.render(false);
        } else if (this.isUp(char)) {
            this.cursorY = Math.max(0, this.cursorY - 1);
            this.render(false);
        } else if (this.isDown(char)) {
            this.cursorY = Math.min(this.gridHeight - 1, this.cursorY + 1);
            this.render(false);
        } else if (char === ' ') {
            const current = this.getPixel(this.cursorX, this.cursorY);
            this.setPixel(this.cursorX, this.cursorY, !current);
            this.render(false);
        } else if (char === 'c') {
            this.clearGrid();
            this.render(false);
        } else if (char === 'i') {
            this.invertGrid();
            this.render(false);
        } else if (char === '\r' || char === '\n') {
            this.handleSubmit();
        }
    }

    protected handleMouse(event: MouseEvent) {
        if (event.action === 'release') {
            this.lastMouse = null;
            return;
        }

        if (this.lastMouse) {
            const dx = event.x - this.lastMouse.x;
            const dy = event.y - this.lastMouse.y;
            
            // Relative movement: scale to grid density
            // X: 1 char = 2 pixels
            // Y: 1 char = 4 pixels
            if (dx !== 0 || dy !== 0) {
                this.cursorX += dx * 2;
                this.cursorY += dy * 4;
                
                // Clamp
                this.cursorX = Math.max(0, Math.min(this.gridWidth - 1, this.cursorX));
                this.cursorY = Math.max(0, Math.min(this.gridHeight - 1, this.cursorY));
                
                // Draw if pressing (Left Button = 0)
                if (event.action === 'press' || (event.action === 'move' && event.button === 0)) {
                    this.setPixel(this.cursorX, this.cursorY, true); 
                }
                // Eraser (Right Button = 2)
                if ((event.action === 'press' || event.action === 'move') && event.button === 2) {
                     this.setPixel(this.cursorX, this.cursorY, false);
                }

                this.render(false);
            }
        } else {
             if (event.action === 'press' && event.button === 0) {
                 this.setPixel(this.cursorX, this.cursorY, true);
                 this.render(false);
             }
        }
        
        this.lastMouse = { x: event.x, y: event.y };
    }

    private clearGrid() {
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                this.grid[y][x] = false;
            }
        }
    }

    private invertGrid() {
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                this.grid[y][x] = !this.grid[y][x];
            }
        }
    }

    private handleSubmit() {
        if (this.options.exportType === 'text') {
            // Render to string
            let result = '';
            for (let y = 0; y < this.options.height; y++) {
                for (let x = 0; x < this.options.width; x++) {
                    result += this.getBrailleChar(x, y);
                }
                result += '\n';
            }
            this.submit(result.trim());
        } else {
            // Default: return matrix
            this.submit(this.grid);
        }
    }
}
