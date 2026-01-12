import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { symbols } from '../symbols';
import { CheckboxOptions } from '../types';

// --- Implementation: Checkbox Prompt ---
export class CheckboxPrompt<V> extends Prompt<any[], CheckboxOptions<V>> {
    private selectedIndex: number = 0;
    private checkedState: boolean[];
    private errorMsg: string = '';
    // Pagination state (added for consistency and performance)
    private scrollTop: number = 0;
    private readonly pageSize: number = 10; 

    constructor(options: CheckboxOptions<V>) {
        super(options);
        this.checkedState = options.choices.map(c => !!c.selected);
    }

    protected render(firstRender: boolean) {
        // Adjust Scroll Top
        if (this.selectedIndex < this.scrollTop) {
            this.scrollTop = this.selectedIndex;
        } else if (this.selectedIndex >= this.scrollTop + this.pageSize) {
            this.scrollTop = this.selectedIndex - this.pageSize + 1;
        }
        
        // Ensure we don't scroll past bounds if list is small
        if (this.options.choices.length <= this.pageSize) {
             this.scrollTop = 0;
        }

        let output = '';
        
        // Header
        const icon = this.errorMsg ? `${theme.error}${symbols.cross}` : `${theme.success}?`;
        output += `${icon} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET} ${theme.muted}(Press <space> to select, <enter> to confirm)${ANSI.RESET}`;

        // List
        const choices = this.options.choices;
        const visibleChoices = choices.slice(this.scrollTop, this.scrollTop + this.pageSize);
        
        visibleChoices.forEach((choice, index) => {
            const actualIndex = this.scrollTop + index;
            output += '\n'; // New line for each item
            
            const cursor = actualIndex === this.selectedIndex ? `${theme.main}${symbols.pointer}${ANSI.RESET}` : ' ';
            const isChecked = this.checkedState[actualIndex];
            const checkbox = isChecked 
                ? `${theme.success}${symbols.checked}${ANSI.RESET}` 
                : `${theme.muted}${symbols.unchecked}${ANSI.RESET}`;
            
            const title = actualIndex === this.selectedIndex 
                ? `${theme.main}${choice.title}${ANSI.RESET}` 
                : choice.title;

            output += `${cursor} ${checkbox} ${title}`;
        });
        
        // Indication of more items
        if (choices.length > this.pageSize) {
             const progress = ` ${this.scrollTop + 1}-${Math.min(this.scrollTop + this.pageSize, choices.length)} of ${choices.length}`;
             // Maybe add this to the header or footer?
             // Let's add it to footer or header. Adding to header is cleaner.
             // But I already wrote header.
             // Let's just append it at the bottom if I want, or ignore for now to keep UI minimal.
        }

        if (this.errorMsg) {
            output += `\n${theme.error}>> ${this.errorMsg}${ANSI.RESET}`;
        }
        
        this.renderFrame(output);
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
            // renderFrame cleans up lines, but doesn't print the final state "persisted" if we want to show the result?
            // Usually we clear the prompt or show a summary.
            // MepCLI seems to submit and let the caller decide or just print newline.
            // Base `submit` prints newline.
            
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
