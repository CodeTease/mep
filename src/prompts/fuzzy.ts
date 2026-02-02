import { SelectPrompt } from './select';
import { FuzzySelectOptions } from '../types';
import { theme } from '../theme';
import { ANSI } from '../ansi';
import { fuzzyMatch } from '../utils';
import { symbols } from '../symbols';

export class FuzzySelectPrompt<V> extends SelectPrompt<V, FuzzySelectOptions<V>> {
    private filteredResults: any[] = [];
    private debounceTimer: any;

    constructor(options: FuzzySelectOptions<V>) {
        super(options);
        this.filteredResults = this.options.choices;
    }
    
    protected getFilteredChoices() {
        // Safety check: this.filteredResults might be undefined if called from super() constructor
        return this.filteredResults || this.options.choices;
    }

    protected handleInput(char: string) {
        // Backspace
        if (char === '\u0008' || char === '\x7f') {
            if (this.searchBuffer.length > 0) {
                this.searchBuffer = this.searchBuffer.slice(0, -1);
                this.performSearch();
            }
            return;
        }

        // Intercept typing to add debounce
        if (char.length === 1 && !/^[\x00-\x1F]/.test(char) && !char.startsWith('\x1b')) {
            this.searchBuffer += char;
            
            // Check if debounce is needed
            if (this.options.choices.length > 1000) {
                if (this.debounceTimer) clearTimeout(this.debounceTimer);
                this.debounceTimer = setTimeout(() => {
                    this.performSearch();
                }, 150); // 150ms debounce
            } else {
                this.performSearch();
            }
            return; // Skip super.handleInput for typing
        }

        super.handleInput(char);
    }

    private performSearch() {
        if (!this.searchBuffer) {
            this.filteredResults = this.options.choices;
        } else {
            const results = this.options.choices.map(c => {
                if (this.isSeparator(c)) return null;
                const match = fuzzyMatch(this.searchBuffer, (c as any).title);
                return { choice: c, match };
            }).filter(item => item && item.match !== null)
              // Sort by score descending
              .sort((a, b) => b!.match!.score - a!.match!.score);
              
            this.filteredResults = results.map(r => {
                 (r!.choice as any)._match = r!.match;
                 return r!.choice;
            });
        }
        
        this.selectedIndex = 0;
        this.render(false);
    }

    private highlight(text: string, indices: number[], isSelected: boolean): string {
        let output = '';
        const indexSet = new Set(indices);
        for (let i = 0; i < text.length; i++) {
            if (indexSet.has(i)) {
                if (isSelected) {
                     output += `${ANSI.BOLD}${ANSI.FG_WHITE}${text[i]}${theme.main}`; // Reset to main theme
                } else {
                     output += `${ANSI.BOLD}${ANSI.FG_CYAN}${text[i]}${ANSI.RESET}`;
                }
            } else {
                output += text[i];
            }
        }
        return output;
    }

    protected render(_firstRender: boolean) {
        let output = '';
        const choices = this.getFilteredChoices();
        
        // Adjust Scroll Top
        if (this.selectedIndex < this.scrollTop) {
            this.scrollTop = this.selectedIndex;
        } else if (this.selectedIndex >= this.scrollTop + this.pageSize) {
            this.scrollTop = this.selectedIndex - this.pageSize + 1;
        }
        if (this.scrollTop > choices.length - 1) {
            this.scrollTop = Math.max(0, choices.length - this.pageSize);
        }

        // Header
        const searchStr = this.searchBuffer ? ` ${theme.muted}(Fuzzy: ${this.searchBuffer})${ANSI.RESET}` : '';
        output += `${theme.success}?${ANSI.RESET} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET}${searchStr}\n`;
        
        if (choices.length === 0) {
            output += `  ${theme.muted}No results found${ANSI.RESET}`; 
        } else {
             const visibleChoices = choices.slice(this.scrollTop, this.scrollTop + this.pageSize);
             
             visibleChoices.forEach((choice, index) => {
                const actualIndex = this.scrollTop + index;
                if (index > 0) output += '\n'; 

                if (this.isSeparator(choice)) {
                    output += `  ${ANSI.DIM}${(choice as any).text || symbols.line.repeat(8)}${ANSI.RESET}`;
                } else {
                    let title = (choice as any).title;
                    const match = (choice as any)._match;
                    const isSelected = actualIndex === this.selectedIndex;

                    if (match && this.searchBuffer) {
                        title = this.highlight(title, match.indices, isSelected);
                    }

                    if (isSelected) {
                        output += `${theme.main}${symbols.pointer} ${title}${ANSI.RESET}`;
                        if (match && this.searchBuffer) {
                            // Show score
                           // output += ` ${theme.muted}(${Math.round(match.score)})${ANSI.RESET}`;
                        }
                    } else {
                        output += `  ${title}`;
                    }
                }
            });
        }
        
        this.renderFrame(output);
    }
}
