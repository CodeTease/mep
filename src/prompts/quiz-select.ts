import { ANSI } from '../ansi';
import { theme } from '../theme';
import { symbols } from '../symbols';
import { QuizSelectOptions } from '../types';
import { SelectPrompt } from './select';

export class QuizSelectPrompt<V> extends SelectPrompt<V, QuizSelectOptions<V>> {
    private status: 'pending' | 'revealed' = 'pending';
    private isCorrect: boolean = false;
    private userSelectionIndex: number = -1;

    constructor(options: QuizSelectOptions<V>) {
        super(options);
    }

    protected handleInput(char: string) {
        if (this.status === 'revealed') {
            // Wait for Enter to submit
            if (char === '\r' || char === '\n') {
                const choices = this.getFilteredChoices();
                // Ensure index is valid, though it should be captured
                const value = choices[this.userSelectionIndex] 
                    ? (choices[this.userSelectionIndex] as any).value 
                    : null;
                this.submit(value as V);
            }
            return;
        }

        if (this.status === 'pending') {
            // Intercept Enter
            if (char === '\r' || char === '\n') {
                const choices = this.getFilteredChoices();
                if (choices.length === 0) return;
                if (this.isSeparator(choices[this.selectedIndex])) return;

                this.userSelectionIndex = this.selectedIndex;
                const selectedChoice = choices[this.userSelectionIndex] as any;
                
                // Check correctness
                this.isCorrect = selectedChoice.value === this.options.correctValue;
                
                this.status = 'revealed';
                this.render(false);
                return;
            }
            
            // Delegate navigation to super
            super.handleInput(char);
        }
    }

    protected render(firstRender: boolean) {
        if (this.status === 'pending') {
            super.render(firstRender);
            return;
        }

        // Revealed State
        let output = '';
        const choices = this.getFilteredChoices();
        
        // Header
        const icon = this.isCorrect ? `${theme.success}${symbols.tick}` : `${theme.error}${symbols.cross}`;
        output += `${icon} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET}\n`;
        
        const visibleChoices = choices.slice(this.scrollTop, this.scrollTop + this.pageSize);
             
        visibleChoices.forEach((choice, index) => {
            if (index > 0) output += '\n';

            if (this.isSeparator(choice)) {
                output += `  ${ANSI.DIM}${(choice as any).text || symbols.line.repeat(8)}${ANSI.RESET}`;
            } else {
                // Determine absolute index to match with user selection
                const actualIndex = this.scrollTop + index;
                const isSelected = actualIndex === this.userSelectionIndex;
                const isCorrectAnswer = (choice as any).value === this.options.correctValue;
                
                let prefix = '  ';
                let style = ANSI.RESET;
                
                if (isSelected) {
                    if (this.isCorrect) {
                        prefix = `${theme.success}${symbols.pointer} `;
                        style = theme.success;
                    } else {
                        prefix = `${theme.error}${symbols.cross} `;
                        style = theme.error;
                    }
                } else if (isCorrectAnswer) {
                     prefix = `${theme.success}${symbols.pointer} `; 
                     style = theme.success; 
                }

                output += `${prefix}${style}${(choice as any).title}${ANSI.RESET}`;
                
                if (isSelected && !this.isCorrect) {
                     output += ` ${theme.error}(Your Answer)${ANSI.RESET}`;
                }
                if (isCorrectAnswer && !isSelected) {
                     output += ` ${theme.success}(Correct)${ANSI.RESET}`;
                }
            }
        });
        
        // Explanation
        if (this.options.explanation) {
            output += `\n\n${ANSI.BOLD}Explanation:${ANSI.RESET}\n${theme.muted}${this.options.explanation}${ANSI.RESET}`;
        }
        
        output += `\n\n${ANSI.DIM}(Press Enter to continue)${ANSI.RESET}`;

        this.renderFrame(output);
    }
}
