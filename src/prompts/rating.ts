import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { symbols } from '../symbols';
import { RatingOptions, MouseEvent } from '../types';

export class RatingPrompt extends Prompt<number, RatingOptions> {
    constructor(options: RatingOptions) {
        super(options);
        // Default to min if initial is not provided
        this.value = options.initial ?? (options.min || 1);
    }

    protected render(_firstRender: boolean) {
        const min = this.options.min || 1;
        const max = this.options.max || 5;

        // Render stars
        let stars = '';
        for (let i = min; i <= max; i++) {
            if (i <= this.value) {
                stars += `${theme.success}${symbols.star}${ANSI.RESET} `;
            } else {
                stars += `${theme.muted}${symbols.starEmpty}${ANSI.RESET} `;
            }
        }

        const output = `${theme.success}?${ANSI.RESET} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET} ${stars}`;
        this.renderFrame(output);
    }

    protected handleInput(char: string) {
        const min = this.options.min || 1;
        const max = this.options.max || 5;

        if (char === '\r' || char === '\n') {
            this.submit(this.value);
            return;
        }

        // Arrow keys
        if (this.isLeft(char) || this.isDown(char)) { // Left/Down decreases
            if (this.value > min) {
                this.value--;
                this.render(false);
            }
        }
        else if (this.isRight(char) || this.isUp(char)) { // Right/Up increases
            if (this.value < max) {
                this.value++;
                this.render(false);
            }
        }

        // Number keys (1-9)
        const num = parseInt(char);
        if (!isNaN(num)) {
            if (num >= min && num <= max) {
                this.value = num;
                this.render(false);
            }
        }
    }

    protected handleMouse(event: MouseEvent) {
        const min = this.options.min || 1;
        const max = this.options.max || 5;

        if (event.action === 'scroll') {
            if (event.scroll === 'up') {
                if (this.value < max) {
                    this.value++;
                    this.render(false);
                }
            } else if (event.scroll === 'down') {
                if (this.value > min) {
                    this.value--;
                    this.render(false);
                }
            }
        }
    }
}
