import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { SelectOptions } from '../types';

// --- Implementation: Select Prompt ---
export class SelectPrompt<V> extends Prompt<any, SelectOptions<V>> {
    private selectedIndex: number = 0;
    private searchBuffer: string = '';
    private scrollTop: number = 0;
    private readonly pageSize: number = 7;

    constructor(options: SelectOptions<V>) {
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
    
    protected render(firstRender: boolean) {
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
        const searchStr = this.searchBuffer ? ` ${theme.muted}(Filter: ${this.searchBuffer})${ANSI.RESET}` : '';
        // Note: We avoid ERASE_LINE here because renderFrame handles full redraw
        output += `${theme.success}?${ANSI.RESET} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET}${searchStr}\n`;
        
        if (choices.length === 0) {
            output += `  ${theme.muted}No results found${ANSI.RESET}`; 
            // We can omit newline at the very end if we want, but usually it's better to be consistent.
            // renderFrame adds newline via truncate logic? No, it joins.
            // So if I want a line break, I must add it.
        } else {
             const visibleChoices = choices.slice(this.scrollTop, this.scrollTop + this.pageSize);
             
             visibleChoices.forEach((choice, index) => {
                const actualIndex = this.scrollTop + index;
                if (index > 0) output += '\n'; // Separator between items

                if (this.isSeparator(choice)) {
                    output += `  ${ANSI.DIM}${(choice as any).text || '────────'}${ANSI.RESET}`;
                } else {
                    if (actualIndex === this.selectedIndex) {
                        output += `${theme.main}❯ ${(choice as any).title}${ANSI.RESET}`;
                    } else {
                        output += `  ${(choice as any).title}`;
                    }
                }
            });
        }
        
        // No manual printing. Pass to renderFrame.
        this.renderFrame(output);
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
            // Cursor is shown by cleanup
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
