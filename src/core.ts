import { ANSI } from './ansi';
import { TextOptions, SelectOptions, ConfirmOptions, CheckboxOptions, ThemeConfig, NumberOptions, ToggleOptions, ListOptions, SliderOptions, DateOptions, FileOptions, MultiSelectOptions } from './types';
import * as fs from 'fs';
import * as path from 'path';

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

    // Helper to check for arrow keys including application mode
    protected isUp(char: string): boolean {
        return char === '\u001b[A' || char === '\u001bOA';
    }
    protected isDown(char: string): boolean {
        return char === '\u001b[B' || char === '\u001bOB';
    }
    protected isRight(char: string): boolean {
        return char === '\u001b[C' || char === '\u001bOC';
    }
    protected isLeft(char: string): boolean {
        return char === '\u001b[D' || char === '\u001bOD';
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
        
        // 4. Calculate Visual Metrics for Wrapping
        const cols = process.stdout.columns || 80;
        const stripAnsi = (str: string) => str.replace(/\x1b\[[0-9;]*m/g, '');
        
        // Prompt String (visual part before value)
        const promptStr = `${icon} ${MepCLI.theme.title}${this.options.message} ${multilineHint} `;
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

        if (this.isUp(char)) { // Up
            if (choices.length > 0) {
                this.selectedIndex = this.findNextSelectableIndex(this.selectedIndex, -1);
                this.render(false);
            }
            return;
        }
        if (this.isDown(char)) { // Down
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

        if (this.isUp(char)) { // Up
            this.selectedIndex = this.selectedIndex > 0 ? this.selectedIndex - 1 : this.options.choices.length - 1;
            this.errorMsg = '';
            this.render(false);
        }
        if (this.isDown(char)) { // Down
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
        if (this.isLeft(char) || this.isRight(char) || char === 'h' || char === 'l') { // Left/Right
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

// --- Implementation: List Prompt ---
class ListPrompt extends Prompt<string[], ListOptions> {
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
        
        const icon = this.errorMsg ? `${MepCLI.theme.error}✖` : `${MepCLI.theme.success}?`;
        this.print(`${icon} ${ANSI.BOLD}${MepCLI.theme.title}${this.options.message}${ANSI.RESET} `);

        // Render Tags
        if (this.value.length > 0) {
            this.value.forEach((tag: string) => {
                this.print(`${MepCLI.theme.main}[${tag}]${ANSI.RESET} `);
            });
        }

        // Render Current Input
        this.print(`${this.currentInput}`);

        if (this.errorMsg) {
             this.print(`\n${ANSI.ERASE_LINE}${MepCLI.theme.error}>> ${this.errorMsg}${ANSI.RESET}`);
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

// --- Implementation: Slider Prompt ---
class SliderPrompt extends Prompt<number, SliderOptions> {
    constructor(options: SliderOptions) {
        super(options);
        this.value = options.initial ?? options.min;
    }

    protected render(firstRender: boolean) {
        this.print(ANSI.HIDE_CURSOR);
        if (!firstRender) {
             this.print(ANSI.ERASE_LINE + ANSI.CURSOR_LEFT);
        }

        const width = 20;
        const range = this.options.max - this.options.min;
        const ratio = (this.value - this.options.min) / range;
        const pos = Math.round(ratio * width);
        
        let bar = '';
        for (let i = 0; i <= width; i++) {
            if (i === pos) bar += `${MepCLI.theme.main}O${ANSI.RESET}`;
            else bar += '─';
        }

        const unit = this.options.unit || '';
        this.print(`${MepCLI.theme.success}?${ANSI.RESET} ${ANSI.BOLD}${MepCLI.theme.title}${this.options.message}${ANSI.RESET} [${bar}] ${this.value}${unit}`);
    }

    protected handleInput(char: string) {
        if (char === '\r' || char === '\n') {
            this.submit(this.value);
            return;
        }
        
        const step = this.options.step || 1;

        if (this.isLeft(char)) { // Left
            this.value = Math.max(this.options.min, this.value - step);
            this.render(false);
        }
        if (this.isRight(char)) { // Right
            this.value = Math.min(this.options.max, this.value + step);
            this.render(false);
        }
    }
}

// --- Implementation: Date Prompt ---
class DatePrompt extends Prompt<Date, DateOptions> {
    private selectedField: number = 0; // 0: Year, 1: Month, 2: Day, 3: Hour, 4: Minute
    private errorMsg: string = '';
    private inputBuffer: string = '';

    constructor(options: DateOptions) {
        super(options);
        this.value = options.initial || new Date();
    }

    protected render(firstRender: boolean) {
        this.print(ANSI.HIDE_CURSOR);
        if (!firstRender) {
            this.print(ANSI.ERASE_LINE + ANSI.CURSOR_LEFT);
             if (this.errorMsg) {
                 this.print(ANSI.UP + ANSI.ERASE_LINE + ANSI.CURSOR_LEFT);
             }
        }

        const y = this.value.getFullYear();
        const m = (this.value.getMonth() + 1).toString().padStart(2, '0');
        const d = this.value.getDate().toString().padStart(2, '0');
        const h = this.value.getHours().toString().padStart(2, '0');
        const min = this.value.getMinutes().toString().padStart(2, '0');

        const fields = [y, m, d, h, min];
        const display = fields.map((val, i) => {
            if (i === this.selectedField) return `${MepCLI.theme.main}${ANSI.UNDERLINE}${val}${ANSI.RESET}`;
            return val;
        });
        
        const icon = this.errorMsg ? `${MepCLI.theme.error}✖` : `${MepCLI.theme.success}?`;
        const dateStr = `${display[0]}-${display[1]}-${display[2]} ${display[3]}:${display[4]}`;
        this.print(`${icon} ${ANSI.BOLD}${MepCLI.theme.title}${this.options.message}${ANSI.RESET} ${dateStr} ${MepCLI.theme.muted}(Use arrows or type)${ANSI.RESET}`);

        if (this.errorMsg) {
            this.print(`\n${ANSI.ERASE_LINE}${MepCLI.theme.error}>> ${this.errorMsg}${ANSI.RESET}`);
            this.print(ANSI.UP); 
            // restore cursor pos logic isn't needed as we are on one line mostly, but for consistency:
             const promptLen = this.options.message.length + 3; // roughly
             this.print(`\x1b[1000D\x1b[${promptLen + 15}C`); // approx move back
        }
    }

    protected handleInput(char: string) {
        if (char === '\r' || char === '\n') {
            this.submit(this.value);
            return;
        }

        if (this.isLeft(char)) { // Left
            this.selectedField = Math.max(0, this.selectedField - 1);
            this.inputBuffer = ''; // Reset buffer on move
            this.errorMsg = '';
            this.render(false);
            return;
        }
        if (this.isRight(char)) { // Right
            this.selectedField = Math.min(4, this.selectedField + 1);
            this.inputBuffer = ''; // Reset buffer on move
            this.errorMsg = '';
            this.render(false);
            return;
        }

        // Support numeric input
        if (/^\d$/.test(char)) {
            const maxLen = this.selectedField === 0 ? 4 : 2;
            let nextBuffer = this.inputBuffer + char;
            
            // If we exceed max length, reset to just the new char (assuming user is starting a new number)
            // Or better: try to parse.
            
            // Logic: 
            // 1. Try appending.
            // 2. Validate.
            // 3. If valid, keep.
            // 4. If invalid (e.g. Month 13), assume new start -> set buffer to just char.
            
            // However, we must respect field limits first.
            if (nextBuffer.length > maxLen) {
                nextBuffer = char;
            }

            const val = parseInt(nextBuffer, 10);
            let valid = true;
            
            // Pre-validation to decide if we should append or reset
            if (this.selectedField === 1 && (val < 1 || val > 12)) valid = false; // Month
            if (this.selectedField === 2 && (val < 1 || val > 31)) valid = false; // Day (rough check)
            if (this.selectedField === 3 && (val > 23)) valid = false; // Hour
            if (this.selectedField === 4 && (val > 59)) valid = false; // Minute

            if (!valid) {
                // If appending made it invalid (e.g. was '1', typed '3' -> '13' invalid month),
                // treat '3' as the start of a new number.
                nextBuffer = char;
            }

            this.inputBuffer = nextBuffer;
            const finalVal = parseInt(this.inputBuffer, 10);

            const d = new Date(this.value);
            
            if (this.selectedField === 0) {
                 // Year is special, we just set it. 
                 d.setFullYear(finalVal);
            }
            else if (this.selectedField === 1) d.setMonth(Math.max(0, Math.min(11, finalVal - 1)));
            else if (this.selectedField === 2) d.setDate(Math.max(1, Math.min(31, finalVal)));
            else if (this.selectedField === 3) d.setHours(Math.max(0, Math.min(23, finalVal)));
            else if (this.selectedField === 4) d.setMinutes(Math.max(0, Math.min(59, finalVal)));
            
            this.value = d;
            this.errorMsg = '';
            this.render(false);
            return;
        }

        // Support standard and application cursor keys
        const isUp = this.isUp(char);
        const isDown = this.isDown(char);

        if (isUp || isDown) {
            this.inputBuffer = ''; // Reset buffer on arrow move
            const dir = isUp ? 1 : -1;
            const d = new Date(this.value);
            
            switch (this.selectedField) {
                case 0: d.setFullYear(d.getFullYear() + dir); break;
                case 1: d.setMonth(d.getMonth() + dir); break;
                case 2: d.setDate(d.getDate() + dir); break;
                case 3: d.setHours(d.getHours() + dir); break;
                case 4: d.setMinutes(d.getMinutes() + dir); break;
            }

            let valid = true;
            if (this.options.min && d < this.options.min) {
                 this.errorMsg = 'Date cannot be before minimum allowed.';
                 valid = false;
            }
            if (this.options.max && d > this.options.max) {
                 this.errorMsg = 'Date cannot be after maximum allowed.';
                 valid = false;
            }

            if (valid) {
                this.value = d;
                this.errorMsg = '';
            }
            this.render(false);
        }
    }
}

// --- Implementation: File Prompt ---
class FilePrompt extends Prompt<string, FileOptions> {
    private input: string = '';
    private cursor: number = 0;
    private suggestions: string[] = [];
    private selectedSuggestion: number = -1;
    private errorMsg: string = '';

    constructor(options: FileOptions) {
        super(options);
        this.input = options.basePath || '';
        this.cursor = this.input.length;
    }

    private updateSuggestions() {
        try {
            const dir = path.dirname(this.input) || '.';
            const partial = path.basename(this.input);
            
            if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
                const files = fs.readdirSync(dir);
                this.suggestions = files
                    .filter(f => f.startsWith(partial))
                    .filter(f => {
                         const fullPath = path.join(dir, f);
                         const isDir = fs.statSync(fullPath).isDirectory();
                         if (this.options.onlyDirectories && !isDir) return false;
                         if (this.options.extensions && !isDir) {
                             return this.options.extensions.some(ext => f.endsWith(ext));
                         }
                         return true;
                    })
                    .map(f => {
                        const fullPath = path.join(dir, f);
                        if (fs.statSync(fullPath).isDirectory()) return f + '/';
                        return f;
                    });
            } else {
                this.suggestions = [];
            }
        } catch (e) {
            this.suggestions = [];
        }
        this.selectedSuggestion = -1;
    }

    protected render(firstRender: boolean) {
        this.print(ANSI.SHOW_CURSOR);

        if (!firstRender) {
             // Clear input line + suggestions
             this.print(ANSI.ERASE_LINE + ANSI.CURSOR_LEFT); // Input line
             // We need to track how many lines suggestions took
             // For now assume simple clear, or use ANSI.ERASE_DOWN if at bottom?
             // Safer to move up and clear
             this.print(ANSI.ERASE_DOWN);
        }
        
        const icon = this.errorMsg ? `${MepCLI.theme.error}✖` : `${MepCLI.theme.success}?`;
        this.print(`${icon} ${ANSI.BOLD}${MepCLI.theme.title}${this.options.message}${ANSI.RESET} ${this.input}`);

        if (this.suggestions.length > 0) {
            this.print('\n');
            const maxShow = 5;
            this.suggestions.slice(0, maxShow).forEach((s, i) => {
                if (i === this.selectedSuggestion) {
                     this.print(`${MepCLI.theme.main}❯ ${s}${ANSI.RESET}\n`);
                } else {
                     this.print(`  ${s}\n`);
                }
            });
            if (this.suggestions.length > maxShow) {
                this.print(`  ...and ${this.suggestions.length - maxShow} more\n`);
            }
            // Move cursor back to input line
            const lines = Math.min(this.suggestions.length, maxShow) + (this.suggestions.length > maxShow ? 2 : 1);
            this.print(`\x1b[${lines}A`);
            const inputLen = this.options.message.length + 3 + this.input.length;
            this.print(`\x1b[${inputLen}C`);
        }
    }

    protected handleInput(char: string) {
        if (char === '\t') { // Tab
            if (this.suggestions.length === 1) {
                const dir = path.dirname(this.input);
                this.input = path.join(dir === '.' ? '' : dir, this.suggestions[0]);
                this.cursor = this.input.length;
                this.suggestions = [];
                this.render(false);
            } else if (this.suggestions.length > 1) {
                // Cycle or show? For now cycle if selected
                if (this.selectedSuggestion !== -1) {
                     const dir = path.dirname(this.input);
                     this.input = path.join(dir === '.' ? '' : dir, this.suggestions[this.selectedSuggestion]);
                     this.cursor = this.input.length;
                     this.suggestions = [];
                     this.render(false);
                } else {
                     // Just show suggestions (already done in render loop usually, but update logic ensures it)
                     this.updateSuggestions();
                     this.render(false);
                }
            } else {
                this.updateSuggestions();
                this.render(false);
            }
            return;
        }

        if (char === '\r' || char === '\n') {
            if (this.selectedSuggestion !== -1) {
                 const dir = path.dirname(this.input);
                 this.input = path.join(dir === '.' ? '' : dir, this.suggestions[this.selectedSuggestion]);
                 this.cursor = this.input.length;
                 this.suggestions = [];
                 this.selectedSuggestion = -1;
                 this.render(false);
            } else {
                this.submit(this.input);
            }
            return;
        }

        if (this.isDown(char)) { // Down
            if (this.suggestions.length > 0) {
                this.selectedSuggestion = (this.selectedSuggestion + 1) % Math.min(this.suggestions.length, 5);
                this.render(false);
            }
            return;
        }
         if (this.isUp(char)) { // Up
            if (this.suggestions.length > 0) {
                this.selectedSuggestion = (this.selectedSuggestion - 1 + Math.min(this.suggestions.length, 5)) % Math.min(this.suggestions.length, 5);
                this.render(false);
            }
            return;
        }

        if (char === '\u0008' || char === '\x7f') { // Backspace
             if (this.input.length > 0) {
                 this.input = this.input.slice(0, -1);
                 this.updateSuggestions();
                 this.render(false);
             }
             return;
        }

        if (!/^[\x00-\x1F]/.test(char) && !char.startsWith('\x1b')) {
            this.input += char;
            this.updateSuggestions();
            this.render(false);
        }
    }
}

// --- Implementation: MultiSelect Prompt ---
class MultiSelectPrompt extends Prompt<any[], MultiSelectOptions> {
    private selectedIndex: number = 0;
    private checkedState: boolean[];
    private searchBuffer: string = '';
    private scrollTop: number = 0;
    private readonly pageSize: number = 7;
    private errorMsg: string = '';

    constructor(options: MultiSelectOptions) {
        super(options);
        this.checkedState = options.choices.map(c => !!c.selected);
        this.selectedIndex = 0;
    }

    private getFilteredChoices() {
        if (!this.searchBuffer) return this.options.choices.map((c, i) => ({ ...c, originalIndex: i }));
        return this.options.choices
            .map((c, i) => ({ ...c, originalIndex: i }))
            .filter(c => c.title.toLowerCase().includes(this.searchBuffer.toLowerCase()));
    }

    protected render(firstRender: boolean) {
        this.print(ANSI.HIDE_CURSOR);
        
        // This is tricky because height changes with filter.
        // Simplified clearing:
        if (!firstRender) {
             this.print(ANSI.ERASE_DOWN); // Clear everything below cursor
             // But we need to move cursor up to start of prompt
             // We can store last height?
        }
        
        // Wait, standard render loop usually assumes fixed position or we manually handle it.
        // Let's use ERASE_LINE + UP loop like SelectPrompt but simpler since we have full screen control in a way
        // Actually, let's just clear screen? No, that's bad.
        // Let's stick to SelectPrompt's strategy.
        
        if (!firstRender) {
             // Hack: Just clear last 10 lines to be safe? No.
             // We will implement proper tracking later if needed, for now standard clear
             // Let's re-use SelectPrompt logic structure if possible, but distinct implementation here.
             
             // Simplest: Always move to top of prompt and erase down.
             // Assuming we track how many lines we printed.
        }

        // ... Implementation detail: use a simpler clear strategy:
        // Move to start of prompt line (we need to track lines printed in previous frame)
        if ((this as any).lastRenderLines) {
            this.print(`\x1b[${(this as any).lastRenderLines}A`);
            this.print(ANSI.ERASE_DOWN);
        }

        let output = '';
        const choices = this.getFilteredChoices();

        // Adjust Scroll
        if (this.selectedIndex < this.scrollTop) {
            this.scrollTop = this.selectedIndex;
        } else if (this.selectedIndex >= this.scrollTop + this.pageSize) {
            this.scrollTop = this.selectedIndex - this.pageSize + 1;
        }
        if (this.scrollTop > choices.length - 1) {
            this.scrollTop = Math.max(0, choices.length - this.pageSize);
        }

        const icon = this.errorMsg ? `${MepCLI.theme.error}✖` : `${MepCLI.theme.success}?`;
        const searchStr = this.searchBuffer ? ` ${MepCLI.theme.muted}(Filter: ${this.searchBuffer})${ANSI.RESET}` : '';
        output += `${icon} ${ANSI.BOLD}${MepCLI.theme.title}${this.options.message}${ANSI.RESET}${searchStr}\n`;
        
        if (choices.length === 0) {
            output += `  ${MepCLI.theme.muted}No results found${ANSI.RESET}\n`;
        } else {
             const visible = choices.slice(this.scrollTop, this.scrollTop + this.pageSize);
             visible.forEach((choice, index) => {
                 const actualIndex = this.scrollTop + index;
                 const cursor = actualIndex === this.selectedIndex ? `${MepCLI.theme.main}❯${ANSI.RESET}` : ' ';
                 const isChecked = this.checkedState[choice.originalIndex];
                 const checkbox = isChecked 
                    ? `${MepCLI.theme.success}◉${ANSI.RESET}` 
                    : `${MepCLI.theme.muted}◯${ANSI.RESET}`;
                 
                 output += `${cursor} ${checkbox} ${choice.title}\n`;
             });
        }
        
        if (this.errorMsg) {
             output += `${MepCLI.theme.error}>> ${this.errorMsg}${ANSI.RESET}\n`;
        }

        this.print(output);
        
        // Count lines
        const lines = 1 + (choices.length === 0 ? 1 : Math.min(choices.length, this.pageSize)) + (this.errorMsg ? 1 : 0);
        (this as any).lastRenderLines = lines;
    }

    protected handleInput(char: string) {
        const choices = this.getFilteredChoices();

        if (char === '\r' || char === '\n') {
            const selectedCount = this.checkedState.filter(Boolean).length;
            const { min = 0, max } = this.options;
             if (selectedCount < min) {
                this.errorMsg = `Select at least ${min}.`;
                this.render(false);
                return;
            }
            if (max && selectedCount > max) {
                this.errorMsg = `Max ${max} allowed.`;
                this.render(false);
                return;
            }
            
             const results = this.options.choices
                .filter((_, i) => this.checkedState[i])
                .map(c => c.value);
            this.submit(results);
            return;
        }

        if (char === ' ') {
            if (choices.length > 0) {
                const choice = choices[this.selectedIndex];
                const originalIndex = choice.originalIndex;
                this.checkedState[originalIndex] = !this.checkedState[originalIndex];
                this.render(false);
            }
            return;
        }

        if (this.isUp(char)) { // Up
             if (choices.length > 0) {
                 this.selectedIndex = (this.selectedIndex - 1 + choices.length) % choices.length;
                 this.render(false);
             }
             return;
        }
        if (this.isDown(char)) { // Down
             if (choices.length > 0) {
                 this.selectedIndex = (this.selectedIndex + 1) % choices.length;
                 this.render(false);
             }
             return;
        }

        if (char === '\u0008' || char === '\x7f') { // Backspace
             if (this.searchBuffer.length > 0) {
                 this.searchBuffer = this.searchBuffer.slice(0, -1);
                 this.selectedIndex = 0;
                 this.render(false);
             }
             return;
        }

        if (!/^[\x00-\x1F]/.test(char) && !char.startsWith('\x1b')) {
            this.searchBuffer += char;
            this.selectedIndex = 0;
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

    static list(options: ListOptions): Promise<string[]> {
        return new ListPrompt(options).run();
    }

    static slider(options: SliderOptions): Promise<number> {
        return new SliderPrompt(options).run();
    }

    static date(options: DateOptions): Promise<Date> {
        return new DatePrompt(options).run();
    }

    static file(options: FileOptions): Promise<string> {
        return new FilePrompt(options).run();
    }

    static multiSelect(options: MultiSelectOptions): Promise<any[]> {
        return new MultiSelectPrompt(options).run();
    }
}