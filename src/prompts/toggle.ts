import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { ToggleOptions } from '../types';

// --- Implementation: Toggle Prompt ---
export class TogglePrompt extends Prompt<boolean, ToggleOptions> {
    constructor(options: ToggleOptions) {
        super(options);
        this.value = options.initial ?? false;
    }

    protected render(firstRender: boolean) {
        this.print(ANSI.HIDE_CURSOR);
        if (!firstRender) {
            this.print(`${ANSI.ERASE_LINE}${ANSI.CURSOR_LEFT}`);
        }

        const activeText = this.options.activeText || 'ON';
        const inactiveText = this.options.inactiveText || 'OFF';

        let toggleDisplay = '';
        if (this.value) {
            toggleDisplay = `${theme.main}[${ANSI.BOLD}${activeText}${ANSI.RESET}${theme.main}]${ANSI.RESET}  ${theme.muted}${inactiveText}${ANSI.RESET}`;
        } else {
            toggleDisplay = `${theme.muted}${activeText}${ANSI.RESET}  ${theme.main}[${ANSI.BOLD}${inactiveText}${ANSI.RESET}${theme.main}]${ANSI.RESET}`;
        }

        this.print(`${theme.success}?${ANSI.RESET} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET} ${toggleDisplay}`);
        this.print(`\x1b[${toggleDisplay.length}D`); // Move back is not really needed as we hide cursor, but kept for consistency
    }

    protected handleInput(char: string) {
        if (char === '\r' || char === '\n') {
            this.submit(this.value);
            return;
        }
        if (this.isLeft(char) || this.isRight(char) || char === 'h' || char === 'l') { // Left/Right
            this.value = !this.value;
            this.render(false);
        }
        if (char === ' ') {
            this.value = !this.value;
            this.render(false);
        }
    }
}
