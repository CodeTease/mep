import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { NumberOptions } from '../types';

// --- Implementation: Number Prompt ---
export class NumberPrompt extends Prompt<number, NumberOptions> {
    private cursor: number = 0;
    private stringValue: string;
    private errorMsg: string = '';

    constructor(options: NumberOptions) {
        super(options);
        this.value = options.initial ?? 0;
        this.stringValue = this.value.toString();
        this.cursor = this.stringValue.length;
    }

    protected render(firstRender: boolean) {
        this.print(ANSI.SHOW_CURSOR);

        if (!firstRender) {
             this.print(ANSI.ERASE_LINE + ANSI.CURSOR_LEFT);
             if (this.errorMsg) {
                 this.print(ANSI.UP + ANSI.ERASE_LINE + ANSI.CURSOR_LEFT);
             }
        }
        
        // 1. Render the Prompt Message
        this.print(ANSI.ERASE_LINE + ANSI.CURSOR_LEFT);
        const icon = this.errorMsg ? `${theme.error}✖` : `${theme.success}?`;
        this.print(`${icon} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET} `);

        // 2. Render the Value
        this.print(`${theme.main}${this.stringValue}${ANSI.RESET}`);

        // 3. Handle Error Message
        if (this.errorMsg) {
            this.print(`\n${ANSI.ERASE_LINE}${theme.error}>> ${this.errorMsg}${ANSI.RESET}`);
            this.print(ANSI.UP); 
            
            const promptLen = this.options.message.length + 3;
            const valLen = this.stringValue.length; 
            this.print(`\x1b[1000D\x1b[${promptLen + valLen}C`);
        }

        // 4. Position Cursor
        const diff = this.stringValue.length - this.cursor;
        if (diff > 0) {
            this.print(`\x1b[${diff}D`);
        }
    }

    protected handleInput(char: string) {
        // Enter
        if (char === '\r' || char === '\n') {
            const num = parseFloat(this.stringValue);
            if (isNaN(num)) {
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

            if (this.errorMsg) {
                this.print(`\n${ANSI.ERASE_LINE}${ANSI.UP}`);
            }
            this.submit(num);
            return;
        }
        
        // Up Arrow (Increment)
        if (this.isUp(char)) {
            let num = parseFloat(this.stringValue) || 0;
            num += (this.options.step ?? 1);
            if (this.options.max !== undefined && num > this.options.max) num = this.options.max;
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
        // Simple paste support for numbers is also good
        if (/^[0-9.\-]+$/.test(char)) {
             // Basic validation for pasted content
             if (char.includes('-') && (this.cursor !== 0 || this.stringValue.includes('-') || char.lastIndexOf('-') > 0)) {
                 // If complex paste fails simple checks, ignore or let user correct
                 // For now, strict check on single char logic is preserved if we want, 
                 // but let's allow pasting valid number strings
             }
             
             // Allow if it looks like a number part
             this.stringValue = this.stringValue.slice(0, this.cursor) + char + this.stringValue.slice(this.cursor);
             this.cursor += char.length;
             this.errorMsg = '';
             this.render(false);
        }
    }
}
