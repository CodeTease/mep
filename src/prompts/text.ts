import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { TextOptions } from '../types';

// --- Implementation: Text Prompt ---
export class TextPrompt extends Prompt<string, TextOptions> {
    private errorMsg: string = '';
    private cursor: number = 0;
    private hasTyped: boolean = false;
    private renderLines: number = 1;

    constructor(options: TextOptions) {
        super(options);
        this.value = options.initial || '';
        this.cursor = this.value.length;
    }

    protected render(firstRender: boolean) {
        // TextPrompt needs the cursor visible!
        this.print(ANSI.SHOW_CURSOR);

        if (!firstRender) {
             // Clear previous lines
             for (let i = 0; i < this.renderLines; i++) {
                 this.print(ANSI.ERASE_LINE);
                 if (i < this.renderLines - 1) this.print(ANSI.UP);
             }
             this.print(ANSI.CURSOR_LEFT);
        }
        
        let output = '';
        
        // 1. Render the Prompt Message
        const icon = this.errorMsg ? `${theme.error}✖` : `${theme.success}?`;
        const multilineHint = this.options.multiline ? ` ${theme.muted}(Press Ctrl+D to submit)${ANSI.RESET}` : '';
        output += `${icon} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET}${multilineHint} `;

        // 2. Render the Value or Placeholder
        let displayValue = '';
        if (!this.value && this.options.placeholder && !this.errorMsg && !this.hasTyped) {
            displayValue = `${theme.muted}${this.options.placeholder}${ANSI.RESET}`;
        } else {
            displayValue = this.options.isPassword ? '*'.repeat(this.value.length) : this.value;
            displayValue = `${theme.main}${displayValue}${ANSI.RESET}`;
        }
        
        output += displayValue;
        
        // 3. Handle Error Message
        if (this.errorMsg) {
             output += `\n${theme.error}>> ${this.errorMsg}${ANSI.RESET}`;
        }
        
        this.print(output);
        
        // 4. Calculate Visual Metrics for Wrapping
        const cols = process.stdout.columns || 80;
        const stripAnsi = (str: string) => str.replace(/\x1b\[[0-9;]*m/g, '');
        
        // Prompt String (visual part before value)
        const promptStr = `${icon} ${theme.title}${this.options.message} ${multilineHint} `;
        const promptVisualLen = stripAnsi(promptStr).length;
        
        // Value String (visual part)
        const rawValue = (!this.value && this.options.placeholder && !this.errorMsg && !this.hasTyped) 
            ? this.options.placeholder || '' 
            : (this.options.isPassword ? '*'.repeat(this.value.length) : this.value);
            
        // Error String (visual part)
        const errorVisualLines = this.errorMsg ? Math.ceil((3 + this.errorMsg.length) / cols) : 0;

        // Calculate Total Lines and Cursor Position
        // We simulate printing the prompt + value + error
        let currentVisualLine = 0;
        let currentCol = 0;
        
        // State tracking for cursor
        let cursorRow = 0;
        let cursorCol = 0;
        
        // Add Prompt
        currentCol += promptVisualLen;
        while (currentCol >= cols) {
            currentVisualLine++;
            currentCol -= cols;
        }
        
        // Add Value (Character by character to handle wrapping and cursor tracking accurately)
        const valueLen = rawValue.length;
        
        // If placeholder, we treat it as value for render height, but cursor is at 0
        const isPlaceholder = (!this.value && this.options.placeholder && !this.errorMsg && !this.hasTyped);
        
        for (let i = 0; i < valueLen; i++) {
            // Check if we are at cursor position
            if (!isPlaceholder && i === this.cursor) {
                cursorRow = currentVisualLine;
                cursorCol = currentCol;
            }
            
            const char = rawValue[i];
            if (char === '\n') {
                currentVisualLine++;
                currentCol = 0;
            } else {
                currentCol++;
                if (currentCol >= cols) {
                    currentVisualLine++;
                    currentCol = 0;
                }
            }
        }
        
        // If cursor is at the very end
        if (!isPlaceholder && this.cursor === valueLen) {
            cursorRow = currentVisualLine;
            cursorCol = currentCol;
        }
        
        // If placeholder, cursor is at start of value
        if (isPlaceholder) {
            let pCol = promptVisualLen;
            let pRow = 0;
            while (pCol >= cols) {
                pRow++;
                pCol -= cols;
            }
            cursorRow = pRow;
            cursorCol = pCol;
        }

        // Final height
        const totalValueRows = currentVisualLine + 1; 
        this.renderLines = totalValueRows + errorVisualLines;

        // 5. Position Cursor Logic
        const endRow = this.renderLines - 1;
        
        // Move up to cursor row
        const linesUp = endRow - cursorRow;
        if (linesUp > 0) {
            this.print(`\x1b[${linesUp}A`);
        }
        
        // Move to cursor col
        this.print(ANSI.CURSOR_LEFT); // Go to col 0
        if (cursorCol > 0) {
            this.print(`\x1b[${cursorCol}C`);
        }
    }

    protected handleInput(char: string) {
        // Enter
        if (char === '\r' || char === '\n') {
            if (this.options.multiline) {
                this.value = this.value.slice(0, this.cursor) + '\n' + this.value.slice(this.cursor);
                this.cursor++;
                this.render(false);
                return;
            }

            this.validateAndSubmit();
            return;
        }
        
        // Ctrl+D (EOF) or Ctrl+S for Submit in Multiline
        if (this.options.multiline && (char === '\u0004' || char === '\u0013')) {
            this.validateAndSubmit();
            return;
        }

        // Backspace
        if (char === '\u0008' || char === '\x7f') { 
            this.hasTyped = true;
            if (this.cursor > 0) {
                this.value = this.value.slice(0, this.cursor - 1) + this.value.slice(this.cursor);
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
            if (this.cursor < this.value.length) {
                this.cursor++;
                this.render(false);
            }
            return;
        }

        // Delete key
        if (char === '\u001b[3~') {
             this.hasTyped = true;
             if (this.cursor < this.value.length) {
                 this.value = this.value.slice(0, this.cursor) + this.value.slice(this.cursor + 1);
                 this.errorMsg = '';
                 this.render(false);
             }
             return;
        }

        // Regular Typing & Paste
        if (!/^[\x00-\x1F]/.test(char) && !char.startsWith('\x1b')) {
            this.hasTyped = true;
            this.value = this.value.slice(0, this.cursor) + char + this.value.slice(this.cursor);
            this.cursor += char.length;
            this.errorMsg = '';
            this.render(false);
        }
    }

    private validateAndSubmit() {
        if (this.options.validate) {
            const result = this.options.validate(this.value);
            
            // Handle Promise validation
            if (result instanceof Promise) {
                // Show loading state
                this.print(`\n${ANSI.ERASE_LINE}${theme.main}Validating...${ANSI.RESET}`);
                this.print(ANSI.UP);

                result.then(valid => {
                     // Clear loading message
                     this.print(`\n${ANSI.ERASE_LINE}`);
                     this.print(ANSI.UP);
                     
                     if (typeof valid === 'string' && valid.length > 0) {
                         this.errorMsg = valid;
                         this.render(false);
                     } else if (valid === false) {
                         this.errorMsg = 'Invalid input';
                         this.render(false);
                     } else {
                        if (this.errorMsg) {
                            this.print(`\n${ANSI.ERASE_LINE}${ANSI.UP}`);
                        }
                         this.submit(this.value);
                     }
                }).catch(err => {
                     this.print(`\n${ANSI.ERASE_LINE}`);
                     this.print(ANSI.UP);
                     this.errorMsg = err.message || 'Validation failed';
                     this.render(false);
                });
                return;
            }

            // Handle Sync validation
            if (typeof result === 'string' && result.length > 0) {
                this.errorMsg = result;
                this.render(false);
                return;
            }
            if (result === false) {
                 this.errorMsg = 'Invalid input';
                 this.render(false);
                 return;
            }
        }
        if (this.errorMsg) {
            this.print(`\n${ANSI.ERASE_LINE}${ANSI.UP}`);
        }
        this.submit(this.value);
    }
}
