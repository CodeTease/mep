import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import type { CheckboxOptions } from '../types';

// --- Implementation: Checkbox Prompt ---
export class CheckboxPrompt<V> extends Prompt<any[], CheckboxOptions<V>> {
    private selectedIndex: number = 0;
    private checkedState: boolean[];
    private errorMsg: string = '';

    constructor(options: CheckboxOptions<V>) {
        super(options);
        this.checkedState = options.choices.map((c) => !!c.selected);
    }

    protected render(firstRender: boolean) {
        // Ensure cursor is HIDDEN for menus
        this.print(ANSI.HIDE_CURSOR);

        if (!firstRender) {
            const extraLines = this.errorMsg ? 1 : 0;
            this.print(`\x1b[${this.options.choices.length + 1 + extraLines}A`);
        }

        this.print(`${ANSI.ERASE_LINE}${ANSI.CURSOR_LEFT}`);
        const icon = this.errorMsg ? `${theme.error}✖` : `${theme.success}?`;
        this.print(
            `${icon} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET} ${theme.muted}(Press <space> to select, <enter> to confirm)${ANSI.RESET}\n`,
        );

        this.options.choices.forEach((choice, index) => {
            this.print(`${ANSI.ERASE_LINE}${ANSI.CURSOR_LEFT}`);
            const cursor = index === this.selectedIndex ? `${theme.main}❯${ANSI.RESET}` : ' ';
            const isChecked = this.checkedState[index];
            const checkbox = isChecked ? `${theme.success}◉${ANSI.RESET}` : `${theme.muted}◯${ANSI.RESET}`;

            const title = index === this.selectedIndex ? `${theme.main}${choice.title}${ANSI.RESET}` : choice.title;

            this.print(`${cursor} ${checkbox} ${title}\n`);
        });

        if (this.errorMsg) {
            this.print(`${ANSI.ERASE_LINE}${theme.error}>> ${this.errorMsg}${ANSI.RESET}`);
        } else if (!firstRender) {
            this.print(`${ANSI.ERASE_LINE}`);
        }
    }

    protected handleInput(char: string) {
        if (char === '\r' || char === '\n') {
            const selectedCount = this.checkedState.filter(Boolean).length;
            const { min = 0, max } = this.options;

            if (selectedCount < min) {
                this.errorMsg = `You must select at least ${min} options.`;
                this.render(false);
                return;
            }
            if (max && selectedCount > max) {
                this.errorMsg = `You can only select up to ${max} options.`;
                this.render(false);
                return;
            }

            this.cleanup();
            this.print(ANSI.SHOW_CURSOR + '\n');

            const results = this.options.choices.filter((_, i) => this.checkedState[i]).map((c) => c.value);

            if ((this as any)._resolve) (this as any)._resolve(results);
            return;
        }

        if (char === ' ') {
            const currentChecked = this.checkedState[this.selectedIndex];
            const selectedCount = this.checkedState.filter(Boolean).length;
            const { max } = this.options;

            if (!currentChecked && max && selectedCount >= max) {
                this.errorMsg = `Max ${max} selections allowed.`;
            } else {
                this.checkedState[this.selectedIndex] = !currentChecked;
                this.errorMsg = '';
            }
            this.render(false);
        }

        if (this.isUp(char)) {
            // Up
            this.selectedIndex = this.selectedIndex > 0 ? this.selectedIndex - 1 : this.options.choices.length - 1;
            this.errorMsg = '';
            this.render(false);
        }
        if (this.isDown(char)) {
            // Down
            this.selectedIndex = this.selectedIndex < this.options.choices.length - 1 ? this.selectedIndex + 1 : 0;
            this.errorMsg = '';
            this.render(false);
        }
    }
}
