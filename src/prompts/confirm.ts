import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { ConfirmOptions } from '../types';

// --- Implementation: Confirm Prompt ---
export class ConfirmPrompt extends Prompt<boolean, ConfirmOptions> {
    constructor(options: ConfirmOptions) {
        super(options);
        this.value = options.initial ?? true;
    }

    protected render(firstRender: boolean) {
        // Hide cursor for confirm, user just hits Y/N or Enter
        this.print(ANSI.HIDE_CURSOR);

        if (!firstRender) {
            this.print(`${ANSI.ERASE_LINE}${ANSI.CURSOR_LEFT}`);
        }
        const hint = this.value ? `${ANSI.BOLD}Yes${ANSI.RESET}/no` : `yes/${ANSI.BOLD}No${ANSI.RESET}`;
        this.print(`${theme.success}?${ANSI.RESET} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET} ${theme.muted}(${hint})${ANSI.RESET} `);
        const text = this.value ? 'Yes' : 'No';
        this.print(`${theme.main}${text}${ANSI.RESET}\x1b[${text.length}D`);
    }

    protected handleInput(char: string) {
        const c = char.toLowerCase();
        if (c === '\r' || c === '\n') {
            this.submit(this.value);
            return;
        }
        if (c === 'y') { this.value = true; this.render(false); }
        if (c === 'n') { this.value = false; this.render(false); }
    }
}
