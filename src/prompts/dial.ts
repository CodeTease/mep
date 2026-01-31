import { Prompt } from '../base';
import { DialOptions, MouseEvent } from '../types';
import { theme } from '../theme';
import { ANSI } from '../ansi';

export class DialPrompt extends Prompt<number, DialOptions> {
    private currentValue: number;

    constructor(options: DialOptions) {
        super(options);
        this.currentValue = options.initial !== undefined ? options.initial : options.min;
        // Clamp initial
        if (this.currentValue < this.options.min) this.currentValue = this.options.min;
        if (this.currentValue > this.options.max) this.currentValue = this.options.max;
    }

    protected render(firstRender: boolean) {
        // Round value for display if necessary
        const displayValue = Math.round(this.currentValue * 100) / 100;
        let output = `${theme.title}${this.options.message}${ANSI.RESET} ${theme.main}${displayValue}${ANSI.RESET}\n`;

        const radius = this.options.radius || 5;
        // Adjust aspect ratio: terminal chars are ~2x taller than wide.
        // So we multiply X by 2.
        const centerX = radius * 2; 
        const centerY = radius;
        const width = centerX * 2 + 1;
        const height = centerY * 2 + 1;

        // Initialize grid
        const grid: string[][] = [];
        for (let y = 0; y < height; y++) {
            const row: string[] = [];
            for (let x = 0; x < width; x++) {
                row.push(' ');
            }
            grid.push(row);
        }

        // Draw track (static circle arc)
        // Knob usually goes from Bottom-Left (135 deg) to Bottom-Right (405 deg)
        // 0 deg is Right. 90 deg is Down.
        for (let a = 135; a <= 405; a += 10) {
             const rad = a * Math.PI / 180;
             const rX = Math.round(centerX + radius * Math.cos(rad) * 2);
             const rY = Math.round(centerY + radius * Math.sin(rad));
             if (rY >= 0 && rY < height && rX >= 0 && rX < width) {
                grid[rY][rX] = `${ANSI.FG_GRAY}·${ANSI.RESET}`;
             }
        }

        // Calculate Pointer Position
        const totalRange = this.options.max - this.options.min;
        // Avoid division by zero
        const percent = totalRange === 0 ? 0 : (this.currentValue - this.options.min) / totalRange;
        const angleDeg = 135 + (percent * 270);
        const rad = angleDeg * Math.PI / 180;
        
        const ptrX = Math.round(centerX + radius * Math.cos(rad) * 2);
        const ptrY = Math.round(centerY + radius * Math.sin(rad));
        
        if (ptrY >= 0 && ptrY < height && ptrX >= 0 && ptrX < width) {
            grid[ptrY][ptrX] = `${theme.main}${this.options.pointerSymbol || '●'}${ANSI.RESET}`;
        }

        // Draw Center Value (Optional - roughly centered)
        // const valStr = displayValue.toString();
        // const valX = centerX - Math.floor(valStr.length / 2);
        // const valY = centerY;
        // if (valY >= 0 && valY < height && valX >= 0 && valX + valStr.length <= width) {
        //    for (let i = 0; i < valStr.length; i++) {
        //        // grid[valY][valX + i] = valStr[i];
        //    }
        // }

        // Construct string
        for (let y = 0; y < height; y++) {
            output += '  ' + grid[y].join('') + '\n';
        }

        // Instructions
        output += `\n${ANSI.FG_GRAY}(Arrows/Scroll to adjust, Enter to submit)${ANSI.RESET}`;

        this.renderFrame(output);
    }

    protected handleInput(char: string, key: Buffer) {
        const step = this.options.step || 1;
        
        if (this.isLeft(char) || this.isDown(char)) {
            this.updateValue(this.currentValue - step);
        } else if (this.isRight(char) || this.isUp(char)) {
            this.updateValue(this.currentValue + step);
        } else if (char === '\r' || char === '\n') {
            this.submit(this.currentValue);
        }
    }

    protected handleMouse(event: MouseEvent) {
        const step = this.options.step || 1;
        if (event.action === 'scroll') {
             if (event.scroll === 'up') {
                 this.updateValue(this.currentValue + step);
             } else {
                 this.updateValue(this.currentValue - step);
             }
        }
    }

    private updateValue(val: number) {
        if (val < this.options.min) val = this.options.min;
        if (val > this.options.max) val = this.options.max;
        
        if (this.currentValue !== val) {
            this.currentValue = val;
            this.render(false);
        }
    }
}
