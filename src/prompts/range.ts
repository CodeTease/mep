import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { symbols } from '../symbols';
import { RangeOptions, MouseEvent } from '../types';

export class RangePrompt extends Prompt<[number, number], RangeOptions> {
    private activeHandle: 'low' | 'high' = 'low';

    constructor(options: RangeOptions) {
        super(options);
        // Ensure initial is sorted and within bounds, default to [min, max] if not provided
        const initial = options.initial || [options.min, options.max];
        // Basic validation for initial
        let [low, high] = initial;
        low = Math.max(options.min, Math.min(low, options.max));
        high = Math.max(options.min, Math.min(high, options.max));
        if (low > high) {
            [low, high] = [high, low];
        }
        this.value = [low, high];
    }

    protected render(_firstRender: boolean) {
        const width = 20;
        const range = this.options.max - this.options.min;
        const [low, high] = this.value;
        
        // Calculate positions (0 to width)
        // Avoid division by zero if min == max
        const ratioLow = range === 0 ? 0 : (low - this.options.min) / range;
        const posLow = Math.round(ratioLow * width);
        
        const ratioHigh = range === 0 ? 1 : (high - this.options.min) / range;
        const posHigh = Math.round(ratioHigh * width);

        let bar = '';
        for (let i = 0; i <= width; i++) {
            if (i === posLow && i === posHigh) {
                 // Collision
                 bar += `${theme.main}|${ANSI.RESET}`;
            } else if (i === posLow) {
                 if (this.activeHandle === 'low') {
                     // Highlight active handle
                     bar += `${theme.main}${ANSI.REVERSE}O${ANSI.RESET}`;
                 } else {
                     bar += `${theme.main}O${ANSI.RESET}`;
                 }
            } else if (i === posHigh) {
                 if (this.activeHandle === 'high') {
                     // Highlight active handle
                     bar += `${theme.main}${ANSI.REVERSE}O${ANSI.RESET}`;
                 } else {
                     bar += `${theme.main}O${ANSI.RESET}`;
                 }
            } else if (i > posLow && i < posHigh) {
                // Active range
                bar += `${theme.main}=${ANSI.RESET}`;
            } else {
                // Dimmed
                bar += symbols.line;
            }
        }

        const unit = this.options.unit || '';
        
        // Format the value display
        let valueDisplay = '';
        if (this.activeHandle === 'low') {
             valueDisplay = `${ANSI.UNDERLINE}${low}${ANSI.RESET}-${high}`;
        } else {
             valueDisplay = `${low}-${ANSI.UNDERLINE}${high}${ANSI.RESET}`;
        }

        const output = `${theme.success}?${ANSI.RESET} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET} [${bar}] ${valueDisplay}${unit}`;
        
        this.renderFrame(output);
    }

    protected handleInput(char: string) {
        if (char === '\r' || char === '\n') {
            this.submit(this.value);
            return;
        }

        if (char === ' ' || char === '\t') {
            this.activeHandle = this.activeHandle === 'low' ? 'high' : 'low';
            this.render(false);
            return;
        }
        
        const step = this.options.step || 1;
        let [low, high] = this.value;

        if (this.isLeft(char)) { // Left
            if (this.activeHandle === 'low') {
                low = Math.max(this.options.min, low - step);
            } else {
                high = Math.max(low, high - step);
            }
        }
        if (this.isRight(char)) { // Right
            if (this.activeHandle === 'low') {
                low = Math.min(high, low + step);
            } else {
                high = Math.min(this.options.max, high + step);
            }
        }
        
        // Rounding to avoid floating point errors
        low = Math.round(low * 10000) / 10000;
        high = Math.round(high * 10000) / 10000;
        
        this.value = [low, high];
        this.render(false);
    }

    protected handleMouse(event: MouseEvent) {
        if (event.action === 'scroll') {
            const step = this.options.step || 1;
            let [low, high] = this.value;

            if (event.scroll === 'up') { // Increase
                 if (this.activeHandle === 'low') {
                    low = Math.min(high, low + step);
                } else {
                    high = Math.min(this.options.max, high + step);
                }
            }
            if (event.scroll === 'down') { // Decrease
                if (this.activeHandle === 'low') {
                    low = Math.max(this.options.min, low - step);
                } else {
                    high = Math.max(low, high - step);
                }
            }
            
            // Rounding
            low = Math.round(low * 10000) / 10000;
            high = Math.round(high * 10000) / 10000;

            this.value = [low, high];
            this.render(false);
        }
    }
}
