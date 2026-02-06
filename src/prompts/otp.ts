import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { OTPOptions } from '../types';

export class OTPPrompt extends Prompt<string, OTPOptions> {
    private slots: string[];
    private cursor: number = 0;
    private readonly length: number;

    constructor(options: OTPOptions) {
        super(options);
        this.length = options.length || 6;
        this.slots = new Array(this.length).fill('');
    }

    protected render(_firstRender: boolean) {
        const mask = this.options.mask || '_';

        let output = `${theme.success}?${ANSI.RESET} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET}\n`;
        output += '  '; // Indent

        for (let i = 0; i < this.length; i++) {
            const val = this.slots[i];
            let charToDisplay = mask;

            if (val) {
                charToDisplay = this.options.secure ? '*' : val;
            } else {
                // Use placeholder char if available at this index
                if (this.options.placeholder && i < this.options.placeholder.length) {
                    charToDisplay = this.options.placeholder[i];
                }
            }

            if (i === this.cursor) {
                output += `${ANSI.REVERSE}${charToDisplay}${ANSI.RESET} `;
            } else {
                if (!val) {
                    output += `${theme.muted}${charToDisplay}${ANSI.RESET} `;
                } else {
                    output += `${theme.main}${charToDisplay}${ANSI.RESET} `;
                }
            }
        }

        this.renderFrame(output);
    }

    protected handleInput(char: string) {
        // Digits
        if (/^\d$/.test(char)) {
            this.slots[this.cursor] = char;

            // If we are at the last slot
            if (this.cursor === this.length - 1) {
                // Only submit if all slots are filled
                if (this.slots.every(s => s !== '')) {
                    this.render(false); // Update view first
                    this.submit(this.slots.join(''));
                    return;
                }
            }

            this.cursor++;
            this.render(false);
            return;
        }

        // Backspace
        if (char === '\u0008' || char === '\x7f') {
            if (this.slots[this.cursor] !== '') {
                this.slots[this.cursor] = '';
            } else if (this.cursor > 0) {
                this.cursor--;
                this.slots[this.cursor] = '';
            }
            this.render(false);
            return;
        }

        // Left Arrow
        if (this.isLeft(char)) {
            if (this.cursor > 0) {
                this.cursor--;
                this.render(false);
            }
            return;
        }

        // Right Arrow
        if (this.isRight(char)) {
            if (this.cursor < this.length - 1) {
                this.cursor++;
                this.render(false);
            }
            return;
        }
    }
}
