import { ANSI } from './ansi';
import { TextOptions, SelectOptions, ConfirmOptions, CheckboxOptions } from './types';

/**
 * Abstract base class for all prompts.
 * Handles common logic like stdin management, raw mode, and cleanup
 * to enforce DRY (Don't Repeat Yourself) principles.
 */
abstract class Prompt<T, O> {
    protected options: O;
    protected value: any;
    protected stdin: NodeJS.ReadStream;
    protected stdout: NodeJS.WriteStream;
    private _resolve?: (value: T | PromiseLike<T>) => void;
    private _reject?: (reason?: any) => void;
    private _onDataHandler?: (chunk: Buffer) => void;

    constructor(options: O) {
        this.options = options;
        this.stdin = process.stdin;
        this.stdout = process.stdout;
    }

    /**
     * Renders the UI. Must be implemented by subclasses.
     * @param firstRender Indicates if this is the initial render.
     */
    protected abstract render(firstRender: boolean): void;

    /**
     * Handles specific key inputs. Must be implemented by subclasses.
     * @param char The string representation of the key.
     * @param key The raw buffer.
     */
    protected abstract handleInput(char: string, key: Buffer): void;

    protected print(text: string) {
        this.stdout.write(text);
    }

    /**
     * Starts the prompt interaction.
     * Sets up raw mode and listeners, returning a Promise.
     */
    public run(): Promise<T> {
        return new Promise((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;

            if (typeof this.stdin.setRawMode === 'function') {
                this.stdin.setRawMode(true);
            }
            this.stdin.resume();
            this.stdin.setEncoding('utf8');

            // Initial render: Default to hidden cursor (good for menus)
            // Subclasses like TextPrompt will explicitly show it if needed.
            this.print(ANSI.HIDE_CURSOR);
            this.render(true);

            this._onDataHandler = (buffer: Buffer) => {
                const char = buffer.toString();

                // Global Exit Handler (Ctrl+C)
                if (char === '\u0003') {
                    this.cleanup();
                    this.print(ANSI.SHOW_CURSOR + '\n');
                    if (this._reject) this._reject(new Error('User force closed'));
                    return;
                }

                this.handleInput(char, buffer);
            };

            this.stdin.on('data', this._onDataHandler);
        });
    }

    /**
     * Cleans up listeners and restores stdin state.
     */
    protected cleanup() {
        if (this._onDataHandler) {
            this.stdin.removeListener('data', this._onDataHandler);
        }
        if (typeof this.stdin.setRawMode === 'function') {
            this.stdin.setRawMode(false);
        }
        this.stdin.pause();
        this.print(ANSI.SHOW_CURSOR);
    }

    /**
     * Submits the final value and resolves the promise.
     */
    protected submit(result: T) {
        this.cleanup();
        this.print('\n'); 
        if (this._resolve) this._resolve(result);
    }
}

// --- Implementation: Text Prompt ---
class TextPrompt extends Prompt<string, TextOptions> {
    private errorMsg: string = '';
    private cursor: number = 0;

    constructor(options: TextOptions) {
        super(options);
        this.value = options.initial || '';
        this.cursor = this.value.length;
    }

    protected render(firstRender: boolean) {
        // TextPrompt needs the cursor visible!
        this.print(ANSI.SHOW_CURSOR);

        if (!firstRender) {
             this.print(ANSI.ERASE_LINE + ANSI.CURSOR_LEFT);
             if (this.errorMsg) {
                 this.print(ANSI.UP + ANSI.ERASE_LINE + ANSI.CURSOR_LEFT);
             }
        }
        
        // 1. Render the Prompt Message
        this.print(ANSI.ERASE_LINE + ANSI.CURSOR_LEFT);
        const icon = this.errorMsg ? `${ANSI.FG_RED}✖` : `${ANSI.FG_GREEN}?`;
        this.print(`${icon} ${ANSI.BOLD}${this.options.message}${ANSI.RESET} `);

        // 2. Render the Value or Placeholder
        if (!this.value && this.options.placeholder && !this.errorMsg) {
            this.print(`${ANSI.FG_GRAY}${this.options.placeholder}${ANSI.RESET}`);
            // Move cursor back to start so typing overwrites placeholder visually
            this.print(`\x1b[${this.options.placeholder.length}D`);
        } else {
            const displayValue = this.options.isPassword ? '*'.repeat(this.value.length) : this.value;
            this.print(`${ANSI.FG_CYAN}${displayValue}${ANSI.RESET}`);
        }

        // 3. Handle Error Message
        if (this.errorMsg) {
            this.print(`\n${ANSI.ERASE_LINE}${ANSI.FG_RED}>> ${this.errorMsg}${ANSI.RESET}`);
            this.print(ANSI.UP); // Go back to input line
            
            // Re-calculate position to end of input
            const promptLen = this.options.message.length + 3; // Icon + 2 spaces
            const valLen = this.value.length; 
            
            // Move to absolute start of line, then move right to end of string
            this.print(`\x1b[1000D\x1b[${promptLen + valLen}C`);
        }

        // 4. Position Cursor Logic
        // At this point, the physical cursor is at the END of the value string.
        // We need to move it LEFT by (length - cursor_index)
        const diff = this.value.length - this.cursor;
        if (diff > 0) {
            this.print(`\x1b[${diff}D`);
        }
    }

    protected handleInput(char: string) {
        // Enter
        if (char === '\r' || char === '\n') {
            if (this.options.validate) {
                const validationResult = this.options.validate(this.value);
                if (typeof validationResult === 'string' && validationResult.length > 0) {
                    this.errorMsg = validationResult;
                    this.render(false);
                    return;
                }
            }
            if (this.errorMsg) {
                this.print(`\n${ANSI.ERASE_LINE}${ANSI.UP}`);
            }
            this.submit(this.value);
            return;
        }

        // Backspace
        if (char === '\u0008' || char === '\x7f') { 
            if (this.cursor > 0) {
                this.value = this.value.slice(0, this.cursor - 1) + this.value.slice(this.cursor);
                this.cursor--;
                this.errorMsg = '';
                this.render(false);
            }
            return;
        }

        // Arrow Left
        if (char === '\u001b[D') {
            if (this.cursor > 0) {
                this.cursor--;
                this.render(false);
            }
            return;
        }

        // Arrow Right
        if (char === '\u001b[C') {
            if (this.cursor < this.value.length) {
                this.cursor++;
                this.render(false);
            }
            return;
        }

        // Delete key
        if (char === '\u001b[3~') {
             if (this.cursor < this.value.length) {
                 this.value = this.value.slice(0, this.cursor) + this.value.slice(this.cursor + 1);
                 this.errorMsg = '';
                 this.render(false);
             }
             return;
        }

        // Regular Typing
        if (char.length === 1 && !/^[\x00-\x1F]/.test(char)) {
            this.value = this.value.slice(0, this.cursor) + char + this.value.slice(this.cursor);
            this.cursor++;
            this.errorMsg = '';
            this.render(false);
        }
    }
}

// --- Implementation: Select Prompt ---
class SelectPrompt extends Prompt<any, SelectOptions> {
    private selectedIndex: number = 0;

    constructor(options: SelectOptions) {
        super(options);
    }

    protected render(firstRender: boolean) {
        // Ensure cursor is HIDDEN for menus
        this.print(ANSI.HIDE_CURSOR);

        if (!firstRender) {
            this.print(`\x1b[${this.options.choices.length + 1}A`);
        }

        this.print(`${ANSI.ERASE_LINE}${ANSI.CURSOR_LEFT}`);
        this.print(`${ANSI.FG_GREEN}?${ANSI.RESET} ${ANSI.BOLD}${this.options.message}${ANSI.RESET}\n`);

        this.options.choices.forEach((choice, index) => {
            this.print(`${ANSI.ERASE_LINE}${ANSI.CURSOR_LEFT}`);
            if (index === this.selectedIndex) {
                this.print(`${ANSI.FG_CYAN}❯ ${choice.title}${ANSI.RESET}\n`);
            } else {
                this.print(`  ${choice.title}\n`);
            }
        });
    }

    protected handleInput(char: string) {
        if (char === '\r' || char === '\n') {
            this.cleanup();
            this.print(`\x1b[${this.options.choices.length - this.selectedIndex}B`); 
            this.print(ANSI.SHOW_CURSOR);
            if ((this as any)._resolve) (this as any)._resolve(this.options.choices[this.selectedIndex].value);
            return;
        }

        if (char === '\u001b[A') { // Up
            this.selectedIndex = this.selectedIndex > 0 ? this.selectedIndex - 1 : this.options.choices.length - 1;
            this.render(false);
        }
        if (char === '\u001b[B') { // Down
            this.selectedIndex = this.selectedIndex < this.options.choices.length - 1 ? this.selectedIndex + 1 : 0;
            this.render(false);
        }
    }
}

// --- Implementation: Checkbox Prompt ---
class CheckboxPrompt extends Prompt<any[], CheckboxOptions> {
    private selectedIndex: number = 0;
    private checkedState: boolean[];
    private errorMsg: string = '';

    constructor(options: CheckboxOptions) {
        super(options);
        this.checkedState = options.choices.map(c => !!c.selected);
    }

    protected render(firstRender: boolean) {
        // Ensure cursor is HIDDEN for menus
        this.print(ANSI.HIDE_CURSOR);

        if (!firstRender) {
            const extraLines = this.errorMsg ? 1 : 0;
            this.print(`\x1b[${this.options.choices.length + 1 + extraLines}A`);
        }

        this.print(`${ANSI.ERASE_LINE}${ANSI.CURSOR_LEFT}`);
        const icon = this.errorMsg ? `${ANSI.FG_RED}✖` : `${ANSI.FG_GREEN}?`;
        this.print(`${icon} ${ANSI.BOLD}${this.options.message}${ANSI.RESET} ${ANSI.FG_GRAY}(Press <space> to select, <enter> to confirm)${ANSI.RESET}\n`);

        this.options.choices.forEach((choice, index) => {
            this.print(`${ANSI.ERASE_LINE}${ANSI.CURSOR_LEFT}`);
            const cursor = index === this.selectedIndex ? `${ANSI.FG_CYAN}❯${ANSI.RESET}` : ' ';
            const isChecked = this.checkedState[index];
            const checkbox = isChecked 
                ? `${ANSI.FG_GREEN}◉${ANSI.RESET}` 
                : `${ANSI.FG_GRAY}◯${ANSI.RESET}`;
            
            const title = index === this.selectedIndex 
                ? `${ANSI.FG_CYAN}${choice.title}${ANSI.RESET}` 
                : choice.title;

            this.print(`${cursor} ${checkbox} ${title}\n`);
        });

        if (this.errorMsg) {
            this.print(`${ANSI.ERASE_LINE}${ANSI.FG_RED}>> ${this.errorMsg}${ANSI.RESET}`);
        } else if (!firstRender) {
             this.print(`${ANSI.ERASE_LINE}`); 
        }
    }

    protected handleInput(char: string) {
        if (char === '\r' || char === '\n') {
            const selectedCount = this.checkedState.filter(Boolean).length;
            const { min = 0, max } = this.options;

            if (selectedCount < min) {
                this.errorMsg = `You must select at least ${min} options.`;
                this.render(false);
                return;
            }
            if (max && selectedCount > max) {
                this.errorMsg = `You can only select up to ${max} options.`;
                this.render(false);
                return;
            }

            this.cleanup();
            this.print(ANSI.SHOW_CURSOR + '\n');
            
            const results = this.options.choices
                .filter((_, i) => this.checkedState[i])
                .map(c => c.value);
                
            if ((this as any)._resolve) (this as any)._resolve(results);
            return;
        }

        if (char === ' ') {
            const currentChecked = this.checkedState[this.selectedIndex];
            const selectedCount = this.checkedState.filter(Boolean).length;
            const { max } = this.options;

            if (!currentChecked && max && selectedCount >= max) {
                this.errorMsg = `Max ${max} selections allowed.`;
            } else {
                this.checkedState[this.selectedIndex] = !currentChecked;
                this.errorMsg = '';
            }
            this.render(false);
        }

        if (char === '\u001b[A') { // Up
            this.selectedIndex = this.selectedIndex > 0 ? this.selectedIndex - 1 : this.options.choices.length - 1;
            this.errorMsg = '';
            this.render(false);
        }
        if (char === '\u001b[B') { // Down
            this.selectedIndex = this.selectedIndex < this.options.choices.length - 1 ? this.selectedIndex + 1 : 0;
            this.errorMsg = '';
            this.render(false);
        }
    }
}

// --- Implementation: Confirm Prompt ---
class ConfirmPrompt extends Prompt<boolean, ConfirmOptions> {
    constructor(options: ConfirmOptions) {
        super(options);
        this.value = options.initial ?? true;
    }

    protected render(firstRender: boolean) {
        // Hide cursor for confirm, user just hits Y/N or Enter
        this.print(ANSI.HIDE_CURSOR);

        if (!firstRender) {
            this.print(`${ANSI.ERASE_LINE}${ANSI.CURSOR_LEFT}`);
        }
        const hint = this.value ? `${ANSI.BOLD}Yes${ANSI.RESET}/no` : `yes/${ANSI.BOLD}No${ANSI.RESET}`;
        this.print(`${ANSI.FG_GREEN}?${ANSI.RESET} ${ANSI.BOLD}${this.options.message}${ANSI.RESET} ${ANSI.FG_GRAY}(${hint})${ANSI.RESET} `);
        const text = this.value ? 'Yes' : 'No';
        this.print(`${ANSI.FG_CYAN}${text}${ANSI.RESET}\x1b[${text.length}D`);
    }

    protected handleInput(char: string) {
        const c = char.toLowerCase();
        if (c === '\r' || c === '\n') {
            this.submit(this.value);
            return;
        }
        if (c === 'y') { this.value = true; this.render(false); }
        if (c === 'n') { this.value = false; this.render(false); }
    }
}

/**
 * Public Facade for MepCLI
 */
export class MepCLI {
    static text(options: TextOptions): Promise<string> {
        return new TextPrompt(options).run();
    }

    static select(options: SelectOptions): Promise<any> {
        return new SelectPrompt(options).run();
    }

    static checkbox(options: CheckboxOptions): Promise<any[]> {
        return new CheckboxPrompt(options).run();
    }

    static confirm(options: ConfirmOptions): Promise<boolean> {
        return new ConfirmPrompt(options).run();
    }

    static password(options: TextOptions): Promise<string> {
        return new TextPrompt({ ...options, isPassword: true }).run();
    }
}