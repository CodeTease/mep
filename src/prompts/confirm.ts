import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { ConfirmOptions, MouseEvent } from '../types';

// --- Implementation: Confirm Prompt ---
export class ConfirmPrompt extends Prompt<boolean, ConfirmOptions> {
    constructor(options: ConfirmOptions) {
        super(options);
        this.value = options.initial ?? true;
    }

    protected render(_firstRender: boolean) {
        // Prepare content
        const hint = this.value ? `${ANSI.BOLD}Yes${ANSI.RESET}/no` : `yes/${ANSI.BOLD}No${ANSI.RESET}`;
        let output = `${theme.success}?${ANSI.RESET} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET} ${theme.muted}(${hint})${ANSI.RESET} `;
        const text = this.value ? 'Yes' : 'No';
        output += `${theme.main}${text}${ANSI.RESET}`;

        this.renderFrame(output);
    }

    protected handleInput(char: string) {
        const c = char.toLowerCase();
        if (c === '\r' || c === '\n') {
            this.submit(this.value);
            return;
        }
        if (c === 'y') { this.value = true; this.render(false); }
        if (c === 'n') { this.value = false; this.render(false); }

        // Allow left/right to toggle as well for better UX
        if (this.isLeft(char) || this.isRight(char)) {
            this.value = !this.value;
            this.render(false);
        }
    }

    protected handleMouse(event: MouseEvent) {
        if (event.action === 'scroll') {
            this.value = !this.value;
            this.render(false);
        }
    }
}
