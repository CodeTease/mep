import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { PatternOptions, MouseEvent } from '../types';

interface Point {
    r: number;
    c: number;
}

export class PatternPrompt extends Prompt<number[], PatternOptions> {
    private path: number[] = [];
    private cursor: Point = { r: 0, c: 0 };
    private isDragging: boolean = false;
    private errorMsg: string = '';

    // Grid configuration
    private rows: number;
    private cols: number;
    private nodeChar: string;

    // Layout
    private nodeSpacingX: number = 4;
    private nodeSpacingY: number = 2;

    private lastMouse: { x: number, y: number } | null = null;

    constructor(options: PatternOptions) {
        super(options);
        this.rows = options.rows || 3;
        this.cols = options.cols || 3;
        this.nodeChar = options.nodeChar || '●';
    }

    private getIndex(r: number, c: number): number {
        return r * this.cols + c;
    }

    private getPoint(index: number): Point {
        return {
            r: Math.floor(index / this.cols),
            c: index % this.cols
        };
    }

    protected render(firstRender: boolean) {
        let output = '';

        // Title
        const icon = this.errorMsg ? `${theme.error}✖` : `${theme.success}?`;
        output += `${icon} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET}\n`;

        // Instructions
        if (firstRender) {
            output += `${ANSI.DIM}(Draw pattern with mouse or use Arrows + Space)${ANSI.RESET}\n`;
        }

        // Render Grid
        // Initialize buffer with spaces
        // Adjust height/width slightly to ensure we cover full lines
        const bufferHeight = this.rows * this.nodeSpacingY + 1;
        const bufferWidth = this.cols * this.nodeSpacingX + 1;
        const buffer: string[][] = Array(bufferHeight).fill(null).map(() => Array(bufferWidth).fill(' '));

        // Draw connections
        for (let i = 0; i < this.path.length - 1; i++) {
            this.drawLine(buffer, this.path[i], this.path[i + 1]);
        }

        // Draw nodes
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const index = this.getIndex(r, c);
                const isSelected = this.path.includes(index);

                // Calculate buffer position
                const by = r * this.nodeSpacingY;
                const bx = c * this.nodeSpacingX;

                // Mark node in buffer (will be stylized later)
                buffer[by][bx] = isSelected ? '●' : '○';
            }
        }

        // Build string from buffer
        // Limit loop to actual grid dimensions to avoid trailing empty lines
        const displayHeight = (this.rows - 1) * this.nodeSpacingY + 1;
        const displayWidth = (this.cols - 1) * this.nodeSpacingX + 1;

        for (let y = 0; y < displayHeight; y++) {
            output += '  '; // Indent
            for (let x = 0; x < displayWidth; x++) {
                const char = buffer[y][x];

                // Determine coloring context
                const isNodeRow = y % this.nodeSpacingY === 0;
                const isNodeCol = x % this.nodeSpacingX === 0;

                if (isNodeRow && isNodeCol) {
                    const r = y / this.nodeSpacingY;
                    const c = x / this.nodeSpacingX;
                    const idx = this.getIndex(r, c);

                    const isSelected = this.path.includes(idx);
                    const isLast = this.path.length > 0 && this.path[this.path.length - 1] === idx;
                    const isCursor = this.cursor.r === r && this.cursor.c === c;

                    let styledChar = this.nodeChar;
                    if (isSelected) styledChar = theme.main + this.nodeChar + ANSI.RESET;
                    if (isLast) styledChar = theme.success + this.nodeChar + ANSI.RESET;

                    if (isCursor) {
                        styledChar = ANSI.REVERSE + styledChar + ANSI.RESET;
                    } else if (!isSelected) {
                        styledChar = theme.muted + '○' + ANSI.RESET;
                    }
                    output += styledChar;
                } else {
                    // It's a line or space
                    if (char !== ' ' && char !== '○' && char !== '●') {
                        output += theme.main + char + ANSI.RESET;
                    } else {
                        output += ' ';
                    }
                }
            }
            output += '\n';
        }

        if (this.errorMsg) {
            output += `\n${theme.error}>> ${this.errorMsg}${ANSI.RESET}`;
        }

        this.renderFrame(output);
    }

    private drawLine(buffer: string[][], fromIdx: number, toIdx: number) {
        const p1 = this.getPoint(fromIdx);
        const p2 = this.getPoint(toIdx);

        const y1 = p1.r * this.nodeSpacingY;
        const x1 = p1.c * this.nodeSpacingX;
        const y2 = p2.r * this.nodeSpacingY;
        const x2 = p2.c * this.nodeSpacingX;

        const dy = y2 - y1;
        const dx = x2 - x1;

        const steps = Math.max(Math.abs(dx), Math.abs(dy));
        if (steps === 0) return;

        const yInc = dy / steps;
        const xInc = dx / steps;

        let y = y1;
        let x = x1;

        for (let i = 0; i <= steps; i++) {
            const ry = Math.round(y);
            const rx = Math.round(x);

            // Check bounds
            if (ry >= 0 && ry < buffer.length && rx >= 0 && rx < buffer[0].length) {
                const isNode = (ry % this.nodeSpacingY === 0) && (rx % this.nodeSpacingX === 0);

                if (!isNode) {
                    // Determine char based on slope
                    // Flat horizontal
                    if (dy === 0) buffer[ry][rx] = '─';
                    // Flat vertical
                    else if (dx === 0) buffer[ry][rx] = '│';
                    // Diagonal
                    else if ((dx > 0 && dy > 0) || (dx < 0 && dy < 0)) buffer[ry][rx] = '╲';
                    else buffer[ry][rx] = '╱';
                }
            }

            y += yInc;
            x += xInc;
        }
    }

    protected handleInput(char: string, _key: Buffer) {
        // Navigation
        if (this.isUp(char)) {
            this.cursor.r = Math.max(0, this.cursor.r - 1);
            this.render(false);
            return;
        }
        if (this.isDown(char)) {
            this.cursor.r = Math.min(this.rows - 1, this.cursor.r + 1);
            this.render(false);
            return;
        }
        if (this.isLeft(char)) {
            this.cursor.c = Math.max(0, this.cursor.c - 1);
            this.render(false);
            return;
        }
        if (this.isRight(char)) {
            this.cursor.c = Math.min(this.cols - 1, this.cursor.c + 1);
            this.render(false);
            return;
        }

        // Selection (Space)
        if (char === ' ') {
            const index = this.getIndex(this.cursor.r, this.cursor.c);
            this.addToPath(index);
            this.render(false);
            return;
        }

        // Submit (Enter)
        if (char === '\r' || char === '\n') {
            if (this.path.length < 2) {
                this.errorMsg = 'Pattern too short';
                this.render(false);
                return;
            }
            this.submit(this.path);
            return;
        }

        // Backspace / Reset
        if (char === '\x7f' || char === '\b') {
            this.path.pop();
            this.render(false);
            return;
        }
    }

    private addToPath(index: number) {
        if (this.path.includes(index)) {
            return;
        }
        this.path.push(index);
    }

    protected handleMouse(event: MouseEvent) {
        if (event.action === 'release') {
            this.isDragging = false;
            this.lastMouse = null;
            if (this.path.length >= 2) {
                this.submit(this.path);
            }
            return;
        }

        if (this.lastMouse) {
            const dx = event.x - this.lastMouse.x;
            const dy = event.y - this.lastMouse.y;

            // Sensitivity threshold
            if (dx !== 0 || dy !== 0) {
                if (Math.abs(dx) > Math.abs(dy)) {
                    if (dx > 0) this.cursor.c = Math.min(this.cols - 1, this.cursor.c + 1);
                    else if (dx < 0) this.cursor.c = Math.max(0, this.cursor.c - 1);
                } else {
                    if (dy > 0) this.cursor.r = Math.min(this.rows - 1, this.cursor.r + 1);
                    else if (dy < 0) this.cursor.r = Math.max(0, this.cursor.r - 1);
                }

                if (this.isDragging) {
                    const idx = this.getIndex(this.cursor.r, this.cursor.c);
                    this.addToPath(idx);
                }

                this.render(false);
            }
        } else {
            // Mouse Down
            if (event.action === 'press' && event.button === 0) {
                this.isDragging = true;
                this.path = []; // Reset
                const idx = this.getIndex(this.cursor.r, this.cursor.c);
                this.addToPath(idx);
                this.render(false);
            }
        }

        this.lastMouse = { x: event.x, y: event.y };
    }
}
