import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { symbols } from '../symbols';
import { FormOptions, FormField, MouseEvent } from '../types';
import { stringWidth } from '../utils';

export class FormPrompt extends Prompt<Record<string, string>, FormOptions> {
    private values: Record<string, string> = {};
    private activeIndex: number = 0;
    private fieldErrors: Record<string, string> = {};
    private globalError: string = '';
    private cursor: number = 0; // Cursor position for the ACTIVE field.
    private lastLinesUp: number = 0; // To track cursor position after render

    constructor(options: FormOptions) {
        super(options);
        this.options.fields.forEach(field => {
            this.values[field.name] = field.initial || '';
        });
        this.cursor = this.values[this.options.fields[0].name].length;
    }

    protected render(firstRender: boolean) {
	if (!firstRender && this.lastLinesUp > 0) {
            this.print(`\x1b[${this.lastLinesUp}B`);
        }
        this.lastLinesUp = 0;

        const cols = process.stdout.columns || 80;
        const outputLines: string[] = [];

        // Title
        outputLines.push(`${theme.success}? ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET}`);
        if (this.globalError) {
             outputLines.push(`${theme.error}>> ${this.globalError}${ANSI.RESET}`);
        }

        let cursorLineIndex = -1;
        let cursorColIndex = 0;

        this.options.fields.forEach((field, index) => {
            const isActive = index === this.activeIndex;
            const value = this.values[field.name];
            const error = this.fieldErrors[field.name];

            // Icon
            let icon = '';
            if (isActive) {
                icon = `${theme.main}${symbols.pointer}`; // >
            } else {
                icon = ' '; // indent
            }

            // Label
            const labelStyle = isActive ? `${theme.main}${ANSI.BOLD}` : theme.muted;
            const label = `${labelStyle}${field.message}:${ANSI.RESET}`;

            // Value
            // Note: Use Secret/Password prompt for case sensitive input, Form prompt is for general text input
            const displayValue = isActive ? value : `${theme.muted}${value}${ANSI.RESET}`;
            
            // Construct Line
            const line = `${icon} ${label} ${displayValue}`;
            outputLines.push(line);

            if (isActive) {
                // Determine cursor position
                // We need visual length of "icon + label + value_up_to_cursor"
                const prefix = `${icon} ${label} `;
                const valuePrefix = value.substring(0, this.cursor);
                cursorLineIndex = outputLines.length - 1;
                cursorColIndex = stringWidth(this.stripAnsi(prefix)) + stringWidth(this.stripAnsi(valuePrefix));            
            }

            // Error for this field
            if (error) {
                outputLines.push(`  ${theme.error}>> ${error}${ANSI.RESET}`);
            }
        });

        // Instructions
        outputLines.push('');
        outputLines.push(`${ANSI.RESET}${theme.muted}(Use Up/Down/Tab to navigate, Enter to submit)${ANSI.RESET}`);

        const output = outputLines.join('\n');
        this.renderFrame(output);

        // Position Cursor
        this.print(ANSI.SHOW_CURSOR);
        
        if (cursorLineIndex !== -1) {
            // Calculate lines up from bottom
            const totalLines = outputLines.length;
            const linesUp = (totalLines - 1) - cursorLineIndex;
            
            if (linesUp > 0) {
                this.print(`\x1b[${linesUp}A`);
                this.lastLinesUp = linesUp;
            }
            
            this.print(ANSI.CURSOR_LEFT);
            if (cursorColIndex > 0) {
                this.print(`\x1b[${cursorColIndex}C`);
            }
        }
    }

    protected handleInput(char: string, key: Buffer) {
        // Navigation: Up / Shift+Tab
        if (this.isUp(char) || (char === '\t' && key /* how to detect Shift+Tab? usually \u001b[Z */) || char === '\u001b[Z') {
            this.validateCurrentField();
            this.moveFocus(-1);
            return;
        }

        // Navigation: Down / Tab
        if (this.isDown(char) || char === '\t') {
            this.validateCurrentField();
            this.moveFocus(1);
            return;
        }

        // Enter
        if (char === '\r' || char === '\n') {
            this.validateCurrentField().then(isValid => {
                 if (isValid) {
                     if (this.activeIndex < this.options.fields.length - 1) {
                         this.moveFocus(1);
                     } else {
                         // Submit
                         this.submitForm();
                     }
                 }
            });
            return;
        }

        // Editing Active Field
        const activeField = this.options.fields[this.activeIndex];
        const val = this.values[activeField.name];

        if (char === '\u0008' || char === '\x7f') { // Backspace
            if (this.cursor > 0) {
                const pre = val.slice(0, this.cursor - 1);
                const post = val.slice(this.cursor);
                this.values[activeField.name] = pre + post;
                this.cursor--;
                this.render(false);
            }
            return;
        }

        // Left/Right arrow to move cursor within field
        if (this.isLeft(char)) {
             if (this.cursor > 0) this.cursor--;
             this.render(false);
             return;
        }
        if (this.isRight(char)) {
             if (this.cursor < val.length) this.cursor++;
             this.render(false);
             return;
        }

        // Typing
        if (!/^[\x00-\x1F]/.test(char) && !char.startsWith('\x1b')) {
            const pre = val.slice(0, this.cursor);
            const post = val.slice(this.cursor);
            this.values[activeField.name] = pre + char + post;
            this.cursor += char.length;
            this.fieldErrors[activeField.name] = ''; // Clear error on type
            this.render(false);
        }
    }

    protected handleMouse(event: MouseEvent) {
        if (event.action === 'scroll') {
            if (event.scroll === 'up') {
                this.validateCurrentField();
                this.moveFocus(-1);
            } else if (event.scroll === 'down') {
                this.validateCurrentField();
                this.moveFocus(1);
            }
        }
    }

    private moveFocus(direction: number) {
        const nextIndex = this.activeIndex + direction;
        if (nextIndex >= 0 && nextIndex < this.options.fields.length) {
            this.activeIndex = nextIndex;
            // "cursor must jump to end of data"
            this.cursor = this.values[this.options.fields[this.activeIndex].name].length;
            this.render(false);
        }
    }

    private async validateCurrentField(): Promise<boolean> {
        const field = this.options.fields[this.activeIndex];
        const val = this.values[field.name];
        
        if (field.validate) {
            try {
                const res = await field.validate(val);
                if (res !== true) {
                    this.fieldErrors[field.name] = typeof res === 'string' ? res : 'Invalid value';
                    this.render(false);
                    return false;
                }
            } catch (err: any) {
                this.fieldErrors[field.name] = err.message || 'Validation failed';
                this.render(false);
                return false;
            }
        }
        
        // Clear error if valid
        delete this.fieldErrors[field.name];
        this.render(false);
        return true;
    }

    private async submitForm() {
        this.globalError = '';
        
        // Validate all fields
        let allValid = true;
        for (const field of this.options.fields) {
            const val = this.values[field.name];
            if (field.validate) {
                 const res = await field.validate(val);
                 if (res !== true) {
                     this.fieldErrors[field.name] = typeof res === 'string' ? res : 'Invalid value';
                     allValid = false;
                 } else {
                     delete this.fieldErrors[field.name];
                 }
            }
        }

        if (allValid) {
            this.submit(this.values);
        } else {
            this.globalError = 'Please fix errors before submitting.';
            this.render(false);
        }
    }
}
