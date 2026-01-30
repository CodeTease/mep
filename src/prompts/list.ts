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
        const cols = process.stdout.columns || 80;

        // 1. Prepare Prefix
        const icon = this.errorMsg ? `${theme.error}${symbols.cross}` : `${theme.success}?`;
        const prefix = `${icon} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET} `;
        
        // 2. Build Lines with Wrapping
        const lines: string[] = [];
        let currentLine = prefix;
        
        // Helper to check width
        const addText = (text: string) => {
             const visualLen = this.stripAnsi(currentLine).length + this.stripAnsi(text).length;
             if (visualLen > cols) {
                 lines.push(currentLine);
                 currentLine = text.trimStart(); // Start new line
             } else {
                 currentLine += text;
             }
        };

        // Render Tags
        if (this.value.length > 0) {
            this.value.forEach((tag: string) => {
                const tagStr = `${theme.main}[${tag}]${ANSI.RESET} `;
                addText(tagStr);
            });
        }

        // Render Current Input
        addText(this.currentInput);
        
        lines.push(currentLine); // Push the last line

        // Track where the input ends (for cursor positioning)
        const inputLineIndex = lines.length - 1;
        const inputVisualCol = this.stripAnsi(currentLine).length;

        // 3. Append Error if any
        if (this.errorMsg) {
             lines.push(`${theme.error}>> ${this.errorMsg}${ANSI.RESET}`);
        }
        
        const output = lines.join('\n');
        
        // 4. Render Frame
        this.renderFrame(output);
        
        this.print(ANSI.SHOW_CURSOR);

        // 5. Position Cursor
        // If we printed lines after the input line (e.g. error msg), move up.
        const totalRows = lines.length;
        const linesUp = (totalRows - 1) - inputLineIndex;
        
        if (linesUp > 0) {
            this.print(`\x1b[${linesUp}A`);
        }
        
        // Move to correct column
        this.print(ANSI.CURSOR_LEFT);
        if (inputVisualCol > 0) {
            this.print(`\x1b[${inputVisualCol}C`);
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
                const last = this.value.pop();
                this.currentInput = last || '';
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
