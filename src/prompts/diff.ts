import { Prompt } from '../base';
import { DiffOptions } from '../types';
import { theme } from '../theme';
import { ANSI } from '../ansi';
import { EditorPrompt } from './editor';

export class DiffPrompt extends Prompt<string, DiffOptions> {
    private activeAction: number = 0; // 0: Original, 1: Modified, 2: Edit
    private actions = ['Use Original', 'Use Modified', 'Edit'];

    constructor(options: DiffOptions) {
        super(options);
    }

    protected render(firstRender: boolean) {
        let output = `${theme.title}${this.options.message}${ANSI.RESET}\n`;

        // Render Diff
        const originalLines = this.options.original ? this.options.original.split('\n') : [];
        const modifiedLines = this.options.modified ? this.options.modified.split('\n') : [];
        
        const width = Math.max(40, (this.stdout.columns || 80) - 4);
        const borderTop = `${ANSI.FG_GRAY}┌${'─'.repeat(width)}┐${ANSI.RESET}`;
        const borderMid = `${ANSI.FG_GRAY}├${'─'.repeat(width)}┤${ANSI.RESET}`;
        const borderBot = `${ANSI.FG_GRAY}└${'─'.repeat(width)}┘${ANSI.RESET}`;

        output += borderTop + '\n';

        // Original (Red)
        if (originalLines.length === 0) {
             output += `${ANSI.FG_GRAY}│ ${ANSI.DIM}(empty)${ANSI.RESET}\n`;
        } else {
            originalLines.forEach(line => {
                const truncated = this.truncate(line, width - 4);
                output += `${ANSI.FG_GRAY}│ ${ANSI.FG_RED}- ${truncated}${ANSI.RESET}\n`;
            });
        }
        
        output += borderMid + '\n';

        // Modified (Green)
        if (modifiedLines.length === 0) {
             output += `${ANSI.FG_GRAY}│ ${ANSI.DIM}(empty)${ANSI.RESET}\n`;
        } else {
            modifiedLines.forEach(line => {
                const truncated = this.truncate(line, width - 4);
                output += `${ANSI.FG_GRAY}│ ${ANSI.FG_GREEN}+ ${truncated}${ANSI.RESET}\n`;
            });
        }

        output += borderBot + '\n';

        // Render Actions
        output += '\n';
        this.actions.forEach((action, index) => {
            if (index === this.activeAction) {
                output += `${ANSI.REVERSE} ${action} ${ANSI.RESET}  `;
            } else {
                output += `[ ${action} ]  `;
            }
        });

        this.renderFrame(output);
    }

    protected handleInput(char: string, key: Buffer) {
        if (this.isLeft(char)) {
            this.activeAction = (this.activeAction - 1 + this.actions.length) % this.actions.length;
            this.render(false);
        } else if (this.isRight(char)) {
            this.activeAction = (this.activeAction + 1) % this.actions.length;
            this.render(false);
        } else if (char === '\r' || char === '\n') {
            this.handleSubmit();
        }
    }

    private handleSubmit() {
        if (this.activeAction === 0) {
            this.submit(this.options.original);
        } else if (this.activeAction === 1) {
            this.submit(this.options.modified);
        } else {
            // Edit
            this.cleanup(); // Stop listening to input for this prompt
            
            // Prepare initial content for editor
            const initial = `<<<<<<< ORIGINAL
${this.options.original}
=======
${this.options.modified}
>>>>>>> MODIFIED`;

            // We delegate to EditorPrompt
            new EditorPrompt({
                message: 'Resolve conflict (Edit)',
                initial: initial,
                extension: '.txt',
                waitUserInput: false // Launch immediately
            }).run().then(result => {
                // Remove conflict markers if user left them? 
                // Usually user should edit them out.
                // We just return what they saved.
                this.submit(result); 
            }).catch(err => {
                 // In case of error, fall back to modified or original?
                 // Or just return the conflict text.
                 this.submit(initial); 
            });
        }
    }
}
