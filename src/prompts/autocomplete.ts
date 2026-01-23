import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { symbols } from '../symbols';
import { AutocompleteOptions, SelectChoice, MouseEvent } from '../types';
import { stringWidth } from '../utils';

export class AutocompletePrompt<V> extends Prompt<V, AutocompleteOptions<V>> {
    private input: string = '';
    private choices: SelectChoice<V>[] = [];
    private selectedIndex: number = 0;
    private loading: boolean = false;
    private debounceTimer?: any;
    private spinnerFrame: number = 0;
    private spinnerTimer?: any;
    private scrollTop: number = 0;
    private readonly pageSize: number = 7;
    private hasSearched: boolean = false;

    constructor(options: AutocompleteOptions<V>) {
        super(options);
        this.input = options.initial || '';
        this.search(this.input);
    }

    private search(query: string) {
        if (this.debounceTimer) clearTimeout(this.debounceTimer);

        this.loading = true;
        this.startSpinner();
        this.render(false);

        this.debounceTimer = setTimeout(async () => {
            try {
                const results = await this.options.suggest(query);
                if (query !== this.input) return;
                
                this.choices = results.slice(0, this.options.limit || 10);
                this.selectedIndex = 0;
                this.scrollTop = 0;
                this.hasSearched = true;
            } catch (err) {
                this.choices = [];
            } finally {
                this.loading = false;
                this.stopSpinner();
                this.render(false);
            }
        }, 300); // 300ms debounce
    }

    private startSpinner() {
        if (this.spinnerTimer) return;
        this.spinnerTimer = setInterval(() => {
            this.spinnerFrame = (this.spinnerFrame + 1) % symbols.spinner.length;
            this.render(false);
        }, 80);
    }

    private stopSpinner() {
        if (this.spinnerTimer) {
            clearInterval(this.spinnerTimer);
            this.spinnerTimer = undefined;
        }
    }

    protected cleanup() {
        this.stopSpinner();
        super.cleanup();
    }

    protected render(firstRender: boolean) {
        // --- FIX START: Restore cursor position ---
        // renderFrame() in Base assumes the cursor is at the bottom of the output.
        // Since Autocomplete moves the cursor to the top (for input) after rendering,
        // we must manually move it back down before the next render cycle.
        if (this.lastRenderHeight > 1) {
            this.print(`\x1b[${this.lastRenderHeight - 1}B`); // Move down
        }
        // --- FIX END ---

        let output = '';
        
        // Header
        const icon = this.loading ? `${theme.main}${symbols.spinner[this.spinnerFrame]}${ANSI.RESET}` : `${theme.success}?${ANSI.RESET}`;
        output += `${icon} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET} ${this.input}`; 
        
        output += '\n';

        if (this.loading) {
            output += `  ${theme.muted}Searching...${ANSI.RESET}`;
        } else if (this.choices.length === 0 && this.hasSearched) {
            output += `  ${theme.muted}${this.options.fallback || 'No results found.'}${ANSI.RESET}`;
        } else if (this.choices.length > 0) {
            // Render list similar to SelectPrompt
            if (this.selectedIndex < this.scrollTop) {
                this.scrollTop = this.selectedIndex;
            } else if (this.selectedIndex >= this.scrollTop + this.pageSize) {
                this.scrollTop = this.selectedIndex - this.pageSize + 1;
            }

            const visibleChoices = this.choices.slice(this.scrollTop, this.scrollTop + this.pageSize);
            
            visibleChoices.forEach((choice, index) => {
                const actualIndex = this.scrollTop + index;
                if (index > 0) output += '\n';

                if (actualIndex === this.selectedIndex) {
                    output += `${theme.main}${symbols.pointer} ${choice.title}${ANSI.RESET}`;
                } else {
                    output += `  ${choice.title}`;
                }
            });
        }
        
        this.renderFrame(output);

        // Position cursor at the end of the input string on the first line
        const lines = output.split('\n');
        const height = lines.length;
        
        // Move up (height - 1)
        if (height > 1) {
            this.print(`\x1b[${height - 1}A`);
        }
        
        this.print(`\r`);
        
        const firstLine = lines[0];
        const visualLen = stringWidth(this.stripAnsi(firstLine)); 
        
        this.print(`\x1b[${visualLen}C`);
        this.print(ANSI.SHOW_CURSOR);
    }

    protected handleInput(char: string) {
        // Enter
        if (char === '\r' || char === '\n') {
            if (this.choices.length > 0) {
                this.submit(this.choices[this.selectedIndex].value);
            }
            return;
        }

        // Backspace
        if (char === '\u0008' || char === '\x7f') {
            if (this.input.length > 0) {
                this.input = this.input.slice(0, -1);
                this.search(this.input);
            }
            return;
        }

        // Up
        if (this.isUp(char)) {
            if (this.choices.length > 0) {
                this.selectedIndex = this.selectedIndex > 0 ? this.selectedIndex - 1 : this.choices.length - 1;
                this.render(false);
            }
            return;
        }

        // Down
        if (this.isDown(char)) {
            if (this.choices.length > 0) {
                this.selectedIndex = this.selectedIndex < this.choices.length - 1 ? this.selectedIndex + 1 : 0;
                this.render(false);
            }
            return;
        }

        // Typing
        if (char.length === 1 && !/^[\x00-\x1F]/.test(char)) {
            this.input += char;
            this.search(this.input);
        }
    }

    protected handleMouse(event: MouseEvent) {
         if (this.choices.length === 0) return;

        if (event.action === 'scroll') {
            if (event.scroll === 'up') {
                this.selectedIndex = this.selectedIndex > 0 ? this.selectedIndex - 1 : this.choices.length - 1;
                this.render(false);
            } else if (event.scroll === 'down') {
                this.selectedIndex = this.selectedIndex < this.choices.length - 1 ? this.selectedIndex + 1 : 0;
                this.render(false);
            }
        }
    }
}
