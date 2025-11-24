import { ANSI } from './ansi';
import { TextOptions, SelectOptions, ConfirmOptions, CheckboxOptions, ThemeConfig, NumberOptions, ToggleOptions } from './types';

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
        const icon = this.errorMsg ? `${MepCLI.theme.error}✖` : `${MepCLI.theme.success}?`;
        const multilineHint = this.options.multiline ? ` ${MepCLI.theme.muted}(Press Ctrl+D to submit)${ANSI.RESET}` : '';
        output += `${icon} ${ANSI.BOLD}${MepCLI.theme.title}${this.options.message}${ANSI.RESET}${multilineHint} `;

        // 2. Render the Value or Placeholder
        let displayValue = '';
        if (!this.value && this.options.placeholder && !this.errorMsg && !this.hasTyped) {
            displayValue = `${MepCLI.theme.muted}${this.options.placeholder}${ANSI.RESET}`;
        } else {
            displayValue = this.options.isPassword ? '*'.repeat(this.value.length) : this.value;
            displayValue = `${MepCLI.theme.main}${displayValue}${ANSI.RESET}`;
        }
        
        output += displayValue;
        
        // 3. Handle Error Message
        if (this.errorMsg) {
             output += `\n${MepCLI.theme.error}>> ${this.errorMsg}${ANSI.RESET}`;
        }
        
        this.print(output);
        
        // Calculate new render lines count
        const valueLines = (this.value || '').split('\n').length;
        const errorLines = this.errorMsg ? 1 : 0;
        // Prompt line is always at least 1, but if value has newlines, it grows
        // Actually, prompt + value are concatenated. Newlines in value make it multi-line.
        // We assume prompt message itself doesn't have newlines for simplicity.
        this.renderLines = Math.max(1, valueLines) + errorLines;

        // 4. Position Cursor Logic
        // We just printed everything. Cursor is at the end.
        // We need to move it back to `this.cursor` position.
        
        // Calculate cursor position (row, col) relative to start of value
        const valueUntilCursor = this.value.slice(0, this.cursor);
        const cursorRows = valueUntilCursor.split('\n').length - 1;
        const lastLineIndex = valueUntilCursor.lastIndexOf('\n');
        const cursorCol = lastLineIndex === -1 ? valueUntilCursor.length : valueUntilCursor.length - lastLineIndex - 1;

        // Total lines printed
        const totalRows = (this.value || '').split('\n').length;
        
        // Move up from bottom
        const linesToMoveUp = (totalRows - 1) - cursorRows + errorLines;
        if (linesToMoveUp > 0) {
            this.print(`\x1b[${linesToMoveUp}A`);
        }
        
        this.print(ANSI.CURSOR_LEFT); // Go to start of line
        
        // If on first line, we need to account for prompt length
        if (cursorRows === 0) {
             const promptLen = 2 + this.options.message.length + 1 + (this.options.multiline ? 25 : 0); // approx
             // Actually, safer to just move right by correct amount
             // But we have ANSI codes in prompt string, so length is tricky.
             // Simpler approach:
             // 1. Move to start of line
             // 2. Move right by prompt length (visual length) + cursorCol
             
             // Strip ANSI for length calc
             const stripAnsi = (str: string) => str.replace(/\x1b\[[0-9;]*m/g, '');
             const promptStr = `${icon} ${MepCLI.theme.title}${this.options.message} ${multilineHint} `;
             const promptVisualLen = stripAnsi(promptStr).length;
             
             if (promptVisualLen + cursorCol > 0) {
                 this.print(`\x1b[${promptVisualLen + cursorCol}C`);
             }
        } else {
            if (cursorCol > 0) {
                this.print(`\x1b[${cursorCol}C`);
            }
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
             this.hasTyped = true;
             if (this.cursor < this.value.length) {
                 this.value = this.value.slice(0, this.cursor) + this.value.slice(this.cursor + 1);
                 this.errorMsg = '';
                 this.render(false);
             }
             return;
        }

        // Regular Typing
        if (char.length === 1 && !/^[\x00-\x1F]/.test(char)) {
            this.hasTyped = true;
            this.value = this.value.slice(0, this.cursor) + char + this.value.slice(this.cursor);
            this.cursor++;
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
                this.print(`\n${ANSI.ERASE_LINE}${MepCLI.theme.main}Validating...${ANSI.RESET}`);
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

// --- Implementation: Select Prompt ---
class SelectPrompt extends Prompt<any, SelectOptions> {
    private selectedIndex: number = 0;
    private searchBuffer: string = '';
    private scrollTop: number = 0;
    private readonly pageSize: number = 7;

    constructor(options: SelectOptions) {
        super(options);
        // Find first non-separator index
        this.selectedIndex = this.findNextSelectableIndex(-1, 1);
    }

    private isSeparator(item: any): boolean {
        return item && item.separator === true;
    }

    private findNextSelectableIndex(currentIndex: number, direction: 1 | -1): number {
        let nextIndex = currentIndex + direction;
        const choices = this.getFilteredChoices();
        
        // Loop around logic
        if (nextIndex < 0) nextIndex = choices.length - 1;
        if (nextIndex >= choices.length) nextIndex = 0;

        if (choices.length === 0) return 0;

        // Safety check to prevent infinite loop if all are separators (shouldn't happen in practice)
        let count = 0;
        while (this.isSeparator(choices[nextIndex]) && count < choices.length) {
            nextIndex += direction;
            if (nextIndex < 0) nextIndex = choices.length - 1;
            if (nextIndex >= choices.length) nextIndex = 0;
            count++;
        }
        return nextIndex;
    }
    
    private getFilteredChoices() {
        if (!this.searchBuffer) return this.options.choices;
        return this.options.choices.filter(c => {
            if (this.isSeparator(c)) return false; // Hide separators when searching
            return (c as any).title.toLowerCase().includes(this.searchBuffer.toLowerCase());
        });
    }
    
    // Custom render to handle variable height clearing
    private lastRenderHeight: number = 0;
    
    protected renderWrapper(firstRender: boolean) {
        if (!firstRender && this.lastRenderHeight > 0) {
            this.print(`\x1b[${this.lastRenderHeight}A`);
        }
        
        let output = '';
        const choices = this.getFilteredChoices();
        
        // Adjust Scroll Top
        if (this.selectedIndex < this.scrollTop) {
            this.scrollTop = this.selectedIndex;
        } else if (this.selectedIndex >= this.scrollTop + this.pageSize) {
            this.scrollTop = this.selectedIndex - this.pageSize + 1;
        }
        // Handle Filtering Edge Case: if list shrinks, scrollTop might be too high
        if (this.scrollTop > choices.length - 1) {
            this.scrollTop = Math.max(0, choices.length - this.pageSize);
        }

        // Header
        const searchStr = this.searchBuffer ? ` ${MepCLI.theme.muted}(Filter: ${this.searchBuffer})${ANSI.RESET}` : '';
        output += `${ANSI.ERASE_LINE}${ANSI.CURSOR_LEFT}${MepCLI.theme.success}?${ANSI.RESET} ${ANSI.BOLD}${MepCLI.theme.title}${this.options.message}${ANSI.RESET}${searchStr}\n`;
        
        if (choices.length === 0) {
            output += `${ANSI.ERASE_LINE}${ANSI.CURSOR_LEFT}  ${MepCLI.theme.muted}No results found${ANSI.RESET}\n`;
        } else {
             const visibleChoices = choices.slice(this.scrollTop, this.scrollTop + this.pageSize);
             
             visibleChoices.forEach((choice, index) => {
                const actualIndex = this.scrollTop + index;
                output += `${ANSI.ERASE_LINE}${ANSI.CURSOR_LEFT}`;
                if (this.isSeparator(choice)) {
                    output += `  ${ANSI.DIM}${(choice as any).text || '────────'}${ANSI.RESET}\n`;
                } else {
                    if (actualIndex === this.selectedIndex) {
                        output += `${MepCLI.theme.main}❯ ${(choice as any).title}${ANSI.RESET}\n`;
                    } else {
                        output += `  ${(choice as any).title}\n`;
                    }
                }
            });
        }
        
        this.print(output);

        // Clear remaining lines if list shrunk
        const visibleCount = Math.min(choices.length, this.pageSize);
        const currentHeight = visibleCount + 1 + (choices.length === 0 ? 1 : 0);
        const linesToClear = this.lastRenderHeight - currentHeight;
        if (linesToClear > 0) {
            for (let i = 0; i < linesToClear; i++) {
                this.print(`${ANSI.ERASE_LINE}\n`);
            }
            this.print(`\x1b[${linesToClear}A`); // Move back up
        }

        this.lastRenderHeight = currentHeight;
    }
    
    protected render(firstRender: boolean) {
        this.print(ANSI.HIDE_CURSOR);
        this.renderWrapper(firstRender);
    }

    protected handleInput(char: string) {
        const choices = this.getFilteredChoices();

        if (char === '\r' || char === '\n') {
            if (choices.length === 0) {
                this.searchBuffer = '';
                this.selectedIndex = this.findNextSelectableIndex(-1, 1);
                this.render(false);
                return;
            }

            if (this.isSeparator(choices[this.selectedIndex])) return;
            
            this.cleanup();
            this.print(ANSI.SHOW_CURSOR);
            if ((this as any)._resolve) (this as any)._resolve((choices[this.selectedIndex] as any).value);
            return;
        }

        if (char === '\u001b[A') { // Up
            if (choices.length > 0) {
                this.selectedIndex = this.findNextSelectableIndex(this.selectedIndex, -1);
                this.render(false);
            }
            return;
        }
        if (char === '\u001b[B') { // Down
            if (choices.length > 0) {
                this.selectedIndex = this.findNextSelectableIndex(this.selectedIndex, 1);
                this.render(false);
            }
            return;
        }
        
        // Backspace
        if (char === '\u0008' || char === '\x7f') {
            if (this.searchBuffer.length > 0) {
                this.searchBuffer = this.searchBuffer.slice(0, -1);
                this.selectedIndex = 0; // Reset selection
                this.selectedIndex = this.findNextSelectableIndex(-1, 1);
                this.render(false);
            }
            return;
        }

        // Typing
         if (char.length === 1 && !/^[\x00-\x1F]/.test(char)) {
            this.searchBuffer += char;
            this.selectedIndex = 0; // Reset selection
             this.selectedIndex = this.findNextSelectableIndex(-1, 1);
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
        const icon = this.errorMsg ? `${MepCLI.theme.error}✖` : `${MepCLI.theme.success}?`;
        this.print(`${icon} ${ANSI.BOLD}${MepCLI.theme.title}${this.options.message}${ANSI.RESET} ${MepCLI.theme.muted}(Press <space> to select, <enter> to confirm)${ANSI.RESET}\n`);

        this.options.choices.forEach((choice, index) => {
            this.print(`${ANSI.ERASE_LINE}${ANSI.CURSOR_LEFT}`);
            const cursor = index === this.selectedIndex ? `${MepCLI.theme.main}❯${ANSI.RESET}` : ' ';
            const isChecked = this.checkedState[index];
            const checkbox = isChecked 
                ? `${MepCLI.theme.success}◉${ANSI.RESET}` 
                : `${MepCLI.theme.muted}◯${ANSI.RESET}`;
            
            const title = index === this.selectedIndex 
                ? `${MepCLI.theme.main}${choice.title}${ANSI.RESET}` 
                : choice.title;

            this.print(`${cursor} ${checkbox} ${title}\n`);
        });

        if (this.errorMsg) {
            this.print(`${ANSI.ERASE_LINE}${MepCLI.theme.error}>> ${this.errorMsg}${ANSI.RESET}`);
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
        this.print(`${MepCLI.theme.success}?${ANSI.RESET} ${ANSI.BOLD}${MepCLI.theme.title}${this.options.message}${ANSI.RESET} ${MepCLI.theme.muted}(${hint})${ANSI.RESET} `);
        const text = this.value ? 'Yes' : 'No';
        this.print(`${MepCLI.theme.main}${text}${ANSI.RESET}\x1b[${text.length}D`);
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

// --- Implementation: Toggle Prompt ---
class TogglePrompt extends Prompt<boolean, ToggleOptions> {
    constructor(options: ToggleOptions) {
        super(options);
        this.value = options.initial ?? false;
    }

    protected render(firstRender: boolean) {
        this.print(ANSI.HIDE_CURSOR);
        if (!firstRender) {
            this.print(`${ANSI.ERASE_LINE}${ANSI.CURSOR_LEFT}`);
        }

        const activeText = this.options.activeText || 'ON';
        const inactiveText = this.options.inactiveText || 'OFF';

        let toggleDisplay = '';
        if (this.value) {
            toggleDisplay = `${MepCLI.theme.main}[${ANSI.BOLD}${activeText}${ANSI.RESET}${MepCLI.theme.main}]${ANSI.RESET}  ${MepCLI.theme.muted}${inactiveText}${ANSI.RESET}`;
        } else {
            toggleDisplay = `${MepCLI.theme.muted}${activeText}${ANSI.RESET}  ${MepCLI.theme.main}[${ANSI.BOLD}${inactiveText}${ANSI.RESET}${MepCLI.theme.main}]${ANSI.RESET}`;
        }

        this.print(`${MepCLI.theme.success}?${ANSI.RESET} ${ANSI.BOLD}${MepCLI.theme.title}${this.options.message}${ANSI.RESET} ${toggleDisplay}`);
        this.print(`\x1b[${toggleDisplay.length}D`); // Move back is not really needed as we hide cursor, but kept for consistency
    }

    protected handleInput(char: string) {
        if (char === '\r' || char === '\n') {
            this.submit(this.value);
            return;
        }
        if (char === '\u001b[D' || char === '\u001b[C' || char === 'h' || char === 'l') { // Left/Right
            this.value = !this.value;
            this.render(false);
        }
        if (char === ' ') {
            this.value = !this.value;
            this.render(false);
        }
    }
}

// --- Implementation: Number Prompt ---
class NumberPrompt extends Prompt<number, NumberOptions> {
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
        const icon = this.errorMsg ? `${MepCLI.theme.error}✖` : `${MepCLI.theme.success}?`;
        this.print(`${icon} ${ANSI.BOLD}${MepCLI.theme.title}${this.options.message}${ANSI.RESET} `);

        // 2. Render the Value
        this.print(`${MepCLI.theme.main}${this.stringValue}${ANSI.RESET}`);

        // 3. Handle Error Message
        if (this.errorMsg) {
            this.print(`\n${ANSI.ERASE_LINE}${MepCLI.theme.error}>> ${this.errorMsg}${ANSI.RESET}`);
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
        if (char === '\u001b[A') {
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
        if (char === '\u001b[B') {
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
        if (char === '\u001b[D') {
            if (this.cursor > 0) {
                this.cursor--;
                this.render(false);
            }
            return;
        }

        // Arrow Right
        if (char === '\u001b[C') {
            if (this.cursor < this.stringValue.length) {
                this.cursor++;
                this.render(false);
            }
            return;
        }
        
        // Numeric Input (and . and -)
        if (/^[0-9.\-]$/.test(char)) {
             if (char === '-' && (this.cursor !== 0 || this.stringValue.includes('-'))) return;
             if (char === '.' && this.stringValue.includes('.')) return;

             this.stringValue = this.stringValue.slice(0, this.cursor) + char + this.stringValue.slice(this.cursor);
             this.cursor++;
             this.errorMsg = '';
             this.render(false);
        }
    }
}

/**
 * Public Facade for MepCLI
 */
export class MepCLI {
    public static theme: ThemeConfig = {
        main: ANSI.FG_CYAN,
        success: ANSI.FG_GREEN,
        error: ANSI.FG_RED,
        muted: ANSI.FG_GRAY,
        title: ANSI.RESET
    };

    /**
     * Shows a spinner while a promise is pending.
     */
    static async spin<T>(message: string, taskPromise: Promise<T>): Promise<T> {
        const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        let i = 0;
        
        process.stdout.write(ANSI.HIDE_CURSOR);
        
        const interval = setInterval(() => {
            process.stdout.write(`${ANSI.ERASE_LINE}${ANSI.CURSOR_LEFT}${MepCLI.theme.main}${frames[i]}${ANSI.RESET} ${message}`);
            i = (i + 1) % frames.length;
        }, 80);

        try {
            const result = await taskPromise;
            clearInterval(interval);
            process.stdout.write(`${ANSI.ERASE_LINE}${ANSI.CURSOR_LEFT}${MepCLI.theme.success}✔${ANSI.RESET} ${message}\n`);
            process.stdout.write(ANSI.SHOW_CURSOR);
            return result;
        } catch (error) {
            clearInterval(interval);
            process.stdout.write(`${ANSI.ERASE_LINE}${ANSI.CURSOR_LEFT}${MepCLI.theme.error}✖${ANSI.RESET} ${message}\n`);
            process.stdout.write(ANSI.SHOW_CURSOR);
            throw error;
        }
    }

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
    
    static number(options: NumberOptions): Promise<number> {
        return new NumberPrompt(options).run();
    }
    
    static toggle(options: ToggleOptions): Promise<boolean> {
        return new TogglePrompt(options).run();
    }
}