import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { ListOptions } from '../types';

// --- Implementation: List Prompt ---
export class ListPrompt extends Prompt<string[], ListOptions> {
    private currentInput: string = '';
    private errorMsg: string = '';

    constructor(options: ListOptions) {
        super(options);
        this.value = options.initial || [];
    }

    protected render(firstRender: boolean) {
        this.print(ANSI.SHOW_CURSOR);

        if (!firstRender) {
             this.print(ANSI.ERASE_LINE + ANSI.CURSOR_LEFT);
             if (this.errorMsg) {
                 this.print(ANSI.UP + ANSI.ERASE_LINE + ANSI.CURSOR_LEFT);
             }
        }
        
        const icon = this.errorMsg ? `${theme.error}✖` : `${theme.success}?`;
        this.print(`${icon} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET} `);

        // Render Tags
        if (this.value.length > 0) {
            this.value.forEach((tag: string) => {
                this.print(`${theme.main}[${tag}]${ANSI.RESET} `);
            });
        }

        // Render Current Input
        this.print(`${this.currentInput}`);

        if (this.errorMsg) {
             this.print(`\n${ANSI.ERASE_LINE}${theme.error}>> ${this.errorMsg}${ANSI.RESET}`);
             this.print(ANSI.UP);
             // Return cursor
             const promptLen = this.options.message.length + 3;
             let tagsLen = 0;
             this.value.forEach((tag: string) => tagsLen += tag.length + 3); // [tag] + space
             const inputLen = this.currentInput.length;
             this.print(`\x1b[1000D\x1b[${promptLen + tagsLen + inputLen}C`);
        }
    }

    protected handleInput(char: string) {
        if (char === '\r' || char === '\n') {
            if (this.currentInput.trim()) {
                this.value.push(this.currentInput.trim());
                this.currentInput = '';
                this.errorMsg = '';
                this.render(false);
            } else {
                // Done if input is empty
                 if (this.options.validate) {
                    const result = this.options.validate(this.value);
                    if (result !== true) {
                        this.errorMsg = typeof result === 'string' ? result : 'Invalid input';
                        this.render(false);
                        return;
                    }
                }
                this.submit(this.value);
            }
            return;
        }

        if (char === '\u0008' || char === '\x7f') { // Backspace
            if (this.currentInput.length > 0) {
                this.currentInput = this.currentInput.slice(0, -1);
                this.render(false);
            } else if (this.value.length > 0) {
                this.value.pop();
                this.render(false);
            }
            return;
        }

        if (!/^[\x00-\x1F]/.test(char) && !char.startsWith('\x1b')) {
            this.currentInput += char;
            this.render(false);
        }
    }
}
