import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { symbols } from '../symbols';
import { NumberOptions, MouseEvent } from '../types';

// --- Implementation: Number Prompt ---
export class NumberPrompt extends Prompt<number, NumberOptions> {
    private stringValue: string = '';
    private cursor: number = 0;
    private errorMsg: string = '';

    constructor(options: NumberOptions) {
        super(options);
        // We work with string for editing, but value property stores the parsed number ultimately
        // Initialize stringValue from initial
        this.stringValue = options.initial !== undefined ? options.initial.toString() : '';
        this.cursor = this.stringValue.length;
    }

    protected render(_firstRender: boolean) {
        // Prepare content
        const icon = this.errorMsg ? `${theme.error}${symbols.cross}` : `${theme.success}?`;
        // Prefix
        let output = `${icon} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET} `;
        // Value
        output += `${theme.main}${this.stringValue}${ANSI.RESET}`;

        if (this.errorMsg) {
             output += `\n${theme.error}>> ${this.errorMsg}${ANSI.RESET}`;
        }
        
        this.renderFrame(output);
        this.print(ANSI.SHOW_CURSOR);

        // Restore cursor position
        // If errorMsg, we are on the line below the input.
        if (this.errorMsg) {
            this.print(ANSI.UP);
        }

        // Calculate visual offset
        const prefix = `${icon} ${theme.title}${this.options.message} `;
        const prefixLen = this.stripAnsi(prefix).length;
        const targetCol = prefixLen + this.cursor;

        this.print(ANSI.CURSOR_LEFT);
        if (targetCol > 0) {
            this.print(`\x1b[${targetCol}C`);
        }
    }

    protected handleInput(char: string) {
        // Enter
        if (char === '\r' || char === '\n') {
            const num = parseFloat(this.stringValue);
            if (this.stringValue.trim() === '' || isNaN(num)) {
                this.errorMsg = 'Please enter a valid number.';
                this.render(false);
                return;
            }
            if (this.options.min !== undefined && num < this.options.min) {
                 this.errorMsg = `Minimum value is ${this.options.min}`;
                 this.render(false);
                 return;
            }
             if (this.options.max !== undefined && num > this.options.max) {
                 this.errorMsg = `Maximum value is ${this.options.max}`;
                 this.render(false);
                 return;
            }

            this.submit(num);
            return;
        }
        
        // Up Arrow (Increment)
        if (this.isUp(char)) {
            let num = parseFloat(this.stringValue) || 0;
            num += (this.options.step ?? 1);
            if (this.options.max !== undefined && num > this.options.max) num = this.options.max;
            // Round to avoid float errors
            num = Math.round(num * 10000) / 10000;
            
            this.stringValue = num.toString();
            this.cursor = this.stringValue.length;
            this.errorMsg = '';
            this.render(false);
            return;
        }

        // Down Arrow (Decrement)
        if (this.isDown(char)) {
            let num = parseFloat(this.stringValue) || 0;
            num -= (this.options.step ?? 1);
            if (this.options.min !== undefined && num < this.options.min) num = this.options.min;
             // Round to avoid float errors
            num = Math.round(num * 10000) / 10000;

            this.stringValue = num.toString();
            this.cursor = this.stringValue.length;
            this.errorMsg = '';
            this.render(false);
            return;
        }

        // Backspace
        if (char === '\u0008' || char === '\x7f') { 
            if (this.cursor > 0) {
                this.stringValue = this.stringValue.slice(0, this.cursor - 1) + this.stringValue.slice(this.cursor);
                this.cursor--;
                this.errorMsg = '';
                this.render(false);
            }
            return;
        }

        // Arrow Left
        if (this.isLeft(char)) {
            if (this.cursor > 0) {
                this.cursor--;
                this.render(false);
            }
            return;
        }

        // Arrow Right
        if (this.isRight(char)) {
            if (this.cursor < this.stringValue.length) {
                this.cursor++;
                this.render(false);
            }
            return;
        }
        
        // Numeric Input (and . and -)
        if (/^[0-9.-]+$/.test(char)) {
             // Allow if it looks like a number part
             this.stringValue = this.stringValue.slice(0, this.cursor) + char + this.stringValue.slice(this.cursor);
             this.cursor += char.length;
             this.errorMsg = '';
             this.render(false);
        }
    }

    protected handleMouse(event: MouseEvent) {
        if (event.action === 'scroll') {
            let num = parseFloat(this.stringValue) || 0;
            const step = this.options.step ?? 1;

            if (event.scroll === 'up') {
                num += step;
                if (this.options.max !== undefined && num > this.options.max) num = this.options.max;
            } else if (event.scroll === 'down') {
                num -= step;
                if (this.options.min !== undefined && num < this.options.min) num = this.options.min;
            }
            
            // Round to avoid float errors
            num = Math.round(num * 10000) / 10000;
            
            this.stringValue = num.toString();
            this.cursor = this.stringValue.length;
            this.errorMsg = '';
            this.render(false);
        }
    }
}
