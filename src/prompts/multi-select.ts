import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { symbols } from '../symbols';
import { MultiSelectOptions } from '../types';

// --- Implementation: MultiSelect Prompt ---
export class MultiSelectPrompt<V> extends Prompt<any[], MultiSelectOptions<V>> {
    private selectedIndex: number = 0;
    private checkedState: boolean[];
    private searchBuffer: string = '';
    private scrollTop: number = 0;
    private readonly pageSize: number = 7;
    private errorMsg: string = '';

    constructor(options: MultiSelectOptions<V>) {
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

        const icon = this.errorMsg ? `${theme.error}${symbols.cross}` : `${theme.success}?`;
        const searchStr = this.searchBuffer ? ` ${theme.muted}(Filter: ${this.searchBuffer})${ANSI.RESET}` : '';
        output += `${icon} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET}${searchStr}\n`;
        
        if (choices.length === 0) {
            output += `  ${theme.muted}No results found${ANSI.RESET}`; // No newline at end
        } else {
             const visible = choices.slice(this.scrollTop, this.scrollTop + this.pageSize);
             visible.forEach((choice, index) => {
                 if (index > 0) output += '\n';
                 
                 const actualIndex = this.scrollTop + index;
                 const cursor = actualIndex === this.selectedIndex ? `${theme.main}${symbols.pointer}${ANSI.RESET}` : ' ';
                 const isChecked = this.checkedState[choice.originalIndex];
                 const checkbox = isChecked 
                    ? `${theme.success}${symbols.checked}${ANSI.RESET}` 
                    : `${theme.muted}${symbols.unchecked}${ANSI.RESET}`;
                 
                 output += `${cursor} ${checkbox} ${choice.title}`;
             });
        }
        
        if (this.errorMsg) {
             output += `\n${theme.error}>> ${this.errorMsg}${ANSI.RESET}`;
        }

        this.renderFrame(output);
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
