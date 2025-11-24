import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { SliderOptions } from '../types';

// --- Implementation: Slider Prompt ---
export class SliderPrompt extends Prompt<number, SliderOptions> {
    constructor(options: SliderOptions) {
        super(options);
        this.value = options.initial ?? options.min;
    }

    protected render(firstRender: boolean) {
        this.print(ANSI.HIDE_CURSOR);
        if (!firstRender) {
             this.print(ANSI.ERASE_LINE + ANSI.CURSOR_LEFT);
        }

        const width = 20;
        const range = this.options.max - this.options.min;
        const ratio = (this.value - this.options.min) / range;
        const pos = Math.round(ratio * width);
        
        let bar = '';
        for (let i = 0; i <= width; i++) {
            if (i === pos) bar += `${theme.main}O${ANSI.RESET}`;
            else bar += '─';
        }

        const unit = this.options.unit || '';
        this.print(`${theme.success}?${ANSI.RESET} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET} [${bar}] ${this.value}${unit}`);
    }

    protected handleInput(char: string) {
        if (char === '\r' || char === '\n') {
            this.submit(this.value);
            return;
        }
        
        const step = this.options.step || 1;

        if (this.isLeft(char)) { // Left
            this.value = Math.max(this.options.min, this.value - step);
            this.render(false);
        }
        if (this.isRight(char)) { // Right
            this.value = Math.min(this.options.max, this.value + step);
            this.render(false);
        }
    }
}
