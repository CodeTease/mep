import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { MultiSelectOptions } from '../types';

// --- Implementation: MultiSelect Prompt ---
export class MultiSelectPrompt extends Prompt<any[], MultiSelectOptions> {
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

        const icon = this.errorMsg ? `${theme.error}✖` : `${theme.success}?`;
        const searchStr = this.searchBuffer ? ` ${theme.muted}(Filter: ${this.searchBuffer})${ANSI.RESET}` : '';
        output += `${icon} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET}${searchStr}\n`;
        
        if (choices.length === 0) {
            output += `  ${theme.muted}No results found${ANSI.RESET}\n`;
        } else {
             const visible = choices.slice(this.scrollTop, this.scrollTop + this.pageSize);
             visible.forEach((choice, index) => {
                 const actualIndex = this.scrollTop + index;
                 const cursor = actualIndex === this.selectedIndex ? `${theme.main}❯${ANSI.RESET}` : ' ';
                 const isChecked = this.checkedState[choice.originalIndex];
                 const checkbox = isChecked 
                    ? `${theme.success}◉${ANSI.RESET}` 
                    : `${theme.muted}◯${ANSI.RESET}`;
                 
                 output += `${cursor} ${checkbox} ${choice.title}\n`;
             });
        }
        
        if (this.errorMsg) {
             output += `${theme.error}>> ${this.errorMsg}${ANSI.RESET}\n`;
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
