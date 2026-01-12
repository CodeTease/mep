import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { symbols } from '../symbols';
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
        // Prepare content
        const icon = this.errorMsg ? `${theme.error}${symbols.cross}` : `${theme.success}?`;
        let mainLine = `${icon} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET} `;

        // Render Tags
        if (this.value.length > 0) {
            this.value.forEach((tag: string) => {
                mainLine += `${theme.main}[${tag}]${ANSI.RESET} `;
            });
        }

        // Render Current Input
        mainLine += `${this.currentInput}`;

        let output = mainLine;
        if (this.errorMsg) {
             output += `\n${theme.error}>> ${this.errorMsg}${ANSI.RESET}`;
        }
        
        // Use Double Buffering
        this.renderFrame(output);
        
        this.print(ANSI.SHOW_CURSOR);

        // If we printed an error, the cursor is at the end of the error line.
        // We need to move it back to the end of the input line.
        if (this.errorMsg) {
            // Move up one line (since error is always on the next line in this simple implementation)
            this.print(ANSI.UP);
            
            // Move to the correct column.
            // We need to calculate visual length of mainLine to place cursor correctly.
            // stripAnsi is available in base class now.
            const visualLength = this.stripAnsi(mainLine).length;
            
            this.print(ANSI.CURSOR_LEFT); // Go to start
            if (visualLength > 0) {
                this.print(`\x1b[${visualLength}C`);
            }
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
