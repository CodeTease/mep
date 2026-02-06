import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { symbols } from '../symbols';
import { ByteOptions, MouseEvent } from '../types';

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

export class BytePrompt extends Prompt<number, ByteOptions> {
    private inputValue: number = 0;
    private buffer: string = '';
    private unitIndex: number = 0;
    private errorMsg: string = '';

    constructor(options: ByteOptions) {
        super(options);
        // Parse initial bytes to best unit
        // e.g. 1073741824 -> 1.00 GB
        let val = options.initial || 0;
        let idx = 0;
        while (val >= 1024 && idx < UNITS.length - 1) {
            val /= 1024;
            idx++;
        }

        // Round to 2 decimals for display if float
        this.inputValue = Math.round(val * 100) / 100;
        this.buffer = this.inputValue.toString();
        this.unitIndex = idx;
    }

    protected render(_firstRender: boolean): void {
        const unitStr = UNITS[this.unitIndex];

        // 1. Render Question & Input
        const icon = this.errorMsg ? `${theme.error}${symbols.cross}` : `${theme.success}?`;
        let output = `${icon} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET} `;

        // Value part
        output += `${theme.main}${ANSI.UNDERLINE}${this.buffer}${ANSI.RESET} ${ANSI.BOLD}${unitStr}${ANSI.RESET}\n`;

        // 2. Render Unit Bar
        // (Unit: B > KB > [MB] > GB)
        let bar = '  ';
        UNITS.forEach((u, i) => {
            if (i === this.unitIndex) {
                bar += `${theme.main}${ANSI.REVERSE} ${u} ${ANSI.RESET}`;
            } else {
                bar += `${theme.muted} ${u} ${ANSI.RESET}`;
            }

            if (i < UNITS.length - 1) {
                bar += ` ${theme.muted}›${ANSI.RESET} `;
            }
        });
        output += `\n${bar}\n`;

        // 3. Hints & Errors
        output += `${theme.muted}  (Arrows: Adjust | Tab: Switch Unit | Enter: Submit)${ANSI.RESET}`;

        if (this.errorMsg) {
            output += `\n${theme.error}>> ${this.errorMsg}${ANSI.RESET}`;
        }

        this.renderFrame(output);
    }

    protected handleInput(char: string): void {
        this.errorMsg = '';

        // Enter
        if (char === '\r' || char === '\n') {
            const finalVal = parseFloat(this.buffer);
            if (isNaN(finalVal)) {
                this.errorMsg = 'Invalid number';
                this.render(false);
                return;
            }

            // Calculate Bytes: value * 1024^index
            const bytes = finalVal * Math.pow(1024, this.unitIndex);

            // Min/Max Validation (in bytes)
            if (this.options.min !== undefined && bytes < this.options.min) {
                this.errorMsg = `Minimum value is ${this.formatBytes(this.options.min)}`;
                this.render(false);
                return;
            }
            if (this.options.max !== undefined && bytes > this.options.max) {
                this.errorMsg = `Maximum value is ${this.formatBytes(this.options.max)}`;
                this.render(false);
                return;
            }

            this.submit(Math.round(bytes)); // Return integer bytes? Or float? Usually bytes are int.
            return;
        }

        // Tab / Shift+Tab -> Switch Unit
        if (char === '\t' || this.isRight(char)) {
            if (this.unitIndex < UNITS.length - 1) {
                this.unitIndex++;
                this.render(false);
            }
            return;
        }
        if (char === '\x1b[Z' || this.isLeft(char)) { // Shift+Tab or Left
            if (this.unitIndex > 0) {
                this.unitIndex--;
                this.render(false);
            }
            return;
        }

        // Arrows -> Adjust Value
        if (this.isUp(char) || this.isDown(char)) {
            let val = parseFloat(this.buffer) || 0;
            // Adaptive step: 1 if integer, 0.1 if float
            const step = this.buffer.includes('.') ? 0.1 : 1;

            if (this.isUp(char)) val += step;
            if (this.isDown(char)) val -= step;

            // Fix Float Precision
            val = Math.round(val * 100) / 100;
            if (val < 0) val = 0; // No negative bytes usually

            this.buffer = val.toString();
            this.render(false);
            return;
        }

        // Typing / Backspace
        if (char === '\u0008' || char === '\x7f') {
            if (this.buffer.length > 0) {
                this.buffer = this.buffer.slice(0, -1);
                this.render(false);
            }
            return;
        }

        // Digits & Dot
        if (/^[0-9.]$/.test(char)) {
            // Prevent multiple dots
            if (char === '.' && this.buffer.includes('.')) return;

            this.buffer += char;
            this.render(false);
        }
    }

    // Helper for error messages
    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + UNITS[i];
    }

    protected handleMouse(event: MouseEvent) {
        if (event.action === 'scroll') {
            if (event.scroll === 'up') {
                // Scroll up -> Increase Value
                let val = parseFloat(this.buffer) || 0;
                val += 1;
                this.buffer = val.toString();
                this.render(false);
            } else if (event.scroll === 'down') {
                // Scroll down -> Decrease Value
                let val = parseFloat(this.buffer) || 0;
                val = Math.max(0, val - 1);
                this.buffer = val.toString();
                this.render(false);
            }
        }
    }
}