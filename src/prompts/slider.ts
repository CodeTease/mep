import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { symbols } from '../symbols';
import { SliderOptions, MouseEvent } from '../types';

// --- Implementation: Slider Prompt ---
export class SliderPrompt extends Prompt<number, SliderOptions> {
    constructor(options: SliderOptions) {
        super(options);
        this.value = options.initial ?? options.min;
    }

    protected render(_firstRender: boolean) {
        const width = 20;
        const range = this.options.max - this.options.min;
        const ratio = (this.value - this.options.min) / range;
        const pos = Math.round(ratio * width);

        let bar = '';
        for (let i = 0; i <= width; i++) {
            if (i === pos) bar += `${theme.main}O${ANSI.RESET}`;
            else bar += symbols.line;
        }

        const unit = this.options.unit || '';
        const output = `${theme.success}?${ANSI.RESET} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET} [${bar}] ${this.value}${unit}`;

        this.renderFrame(output);
    }

    protected handleInput(char: string) {
        if (char === '\r' || char === '\n') {
            this.submit(this.value);
            return;
        }

        const step = this.options.step || 1;

        if (this.isLeft(char)) { // Left
            this.value = Math.max(this.options.min, this.value - step);
            // Round to avoid float errors
            this.value = Math.round(this.value * 10000) / 10000;
            this.render(false);
        }
        if (this.isRight(char)) { // Right
            this.value = Math.min(this.options.max, this.value + step);
            // Round to avoid float errors
            this.value = Math.round(this.value * 10000) / 10000;
            this.render(false);
        }
    }

    protected handleMouse(event: MouseEvent) {
        if (event.action === 'scroll') {
            const step = this.options.step || 1;

            if (event.scroll === 'up') { // Scroll Up -> Increase
                this.value = Math.min(this.options.max, this.value + step);
            }
            if (event.scroll === 'down') { // Scroll Down -> Decrease
                this.value = Math.max(this.options.min, this.value - step);
            }

            // Round to avoid float errors
            this.value = Math.round(this.value * 10000) / 10000;
            this.render(false);
        }
    }
}
