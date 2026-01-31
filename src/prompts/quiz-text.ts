import { ANSI } from '../ansi';
import { theme } from '../theme';
import { symbols } from '../symbols';
import { QuizTextOptions } from '../types';
import { TextPrompt } from './text';

export class QuizTextPrompt extends TextPrompt<QuizTextOptions> {
    private status: 'pending' | 'revealed' = 'pending';
    private isCorrect: boolean = false;

    constructor(options: QuizTextOptions) {
        super(options);
    }

    protected handleInput(char: string) {
        if (this.status === 'revealed') {
             if (char === '\r' || char === '\n') {
                 // Call Prompt.submit directly?
                 // We need to bypass our own override check.
                 // We can do this by setting status to done before calling super.submit, 
                 // but here we are in revealed state.
                 // If we call super.submit(this.value), it calls our overridden submit.
                 // Our overridden submit checks status.
                 // So we just need to ensure our overridden submit handles 'revealed' status correctly.
                 this.submit(this.value);
             }
             return;
        }
        
        super.handleInput(char);
    }
    
    protected submit(value: string) {
        if (this.status === 'pending') {
             // We caught the submission from TextPrompt logic.
             // Now verify correctness.
             
             this.checkCorrectness(value).then(correct => {
                 this.isCorrect = correct;
                 this.status = 'revealed';
                 this.render(false);
             });
        } else {
            // If revealed (or anything else), we proceed to final submission.
            // This calls Prompt.submit
            super.submit(value);
        }
    }
    
    private async checkCorrectness(value: string): Promise<boolean> {
        try {
            if (this.options.verify) {
                return await this.options.verify(value);
            }
            if (this.options.correctAnswer) {
                return value.trim().toLowerCase() === this.options.correctAnswer.trim().toLowerCase();
            }
            return false;
        } catch (_e) {
            return false;
        }
    }

    protected render(firstRender: boolean) {
        if (this.status === 'pending') {
            super.render(firstRender);
            return;
        }

        // Revealed State
        let output = '';
        const icon = this.isCorrect ? `${theme.success}${symbols.tick}` : `${theme.error}${symbols.cross}`;
        output += `${icon} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET}\n`;
        
        const userValue = this.segments.join('');
        
        // Display user input
        if (this.isCorrect) {
             output += `  ${theme.success}${userValue}${ANSI.RESET} ${theme.success}(Correct)${ANSI.RESET}`;
        } else {
             output += `  ${theme.error}${userValue}${ANSI.RESET} ${theme.error}(Wrong)${ANSI.RESET}`;
        }
        
        // Show correct answer if wrong
        if (!this.isCorrect && this.options.correctAnswer) {
             output += `\n  ${theme.success}Correct Answer: ${this.options.correctAnswer}${ANSI.RESET}`;
        }
        
        // Explanation
        if (this.options.explanation) {
             output += `\n\n${ANSI.BOLD}Explanation:${ANSI.RESET}\n${theme.muted}${this.options.explanation}${ANSI.RESET}`;
        }
        
        output += `\n\n${ANSI.DIM}(Press Enter to continue)${ANSI.RESET}`;
        
        this.renderFrame(output);
    }
}
