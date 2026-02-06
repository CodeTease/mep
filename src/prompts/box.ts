import { Prompt } from '../base';
import { BoxOptions, MouseEvent } from '../types';
import { ANSI } from '../ansi';
import { theme } from '../theme';

type Side = 'top' | 'right' | 'bottom' | 'left';

interface BoxValues {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

export class BoxPrompt extends Prompt<BoxValues, BoxOptions> {
    private values: BoxValues;
    private focus: Side = 'top';
    private inputBuffer: string = '';

    constructor(options: BoxOptions) {
        super(options);

        const initial: any = options.initial;
        if (typeof initial === 'number') {
            this.values = { top: initial, right: initial, bottom: initial, left: initial };
        } else if (typeof initial === 'object') {
            this.values = {
                top: initial.top ?? 0,
                right: initial.right ?? 0,
                bottom: initial.bottom ?? 0,
                left: initial.left ?? 0
            };
        } else {
            this.values = { top: 0, right: 0, bottom: 0, left: 0 };
        }

        this.inputBuffer = this.values.top.toString();
    }

    private commitBuffer() {
        let val = parseInt(this.inputBuffer, 10);
        if (isNaN(val)) val = 0;

        // Apply constraints
        if (this.options.min !== undefined && val < this.options.min) val = this.options.min;
        if (this.options.max !== undefined && val > this.options.max) val = this.options.max;

        this.values[this.focus] = val;
        this.inputBuffer = val.toString(); // Normalize buffer
    }

    private changeFocus(newFocus: Side) {
        this.commitBuffer(); // Save current
        this.focus = newFocus;
        this.inputBuffer = this.values[newFocus].toString();
    }

    private increment(amount: number) {
        let val = parseInt(this.inputBuffer, 10);
        if (isNaN(val)) val = 0;
        val += amount;

        if (this.options.min !== undefined && val < this.options.min) val = this.options.min;
        if (this.options.max !== undefined && val > this.options.max) val = this.options.max;

        this.inputBuffer = val.toString();
    }

    protected render(_firstRender: boolean) {
        const title = `${theme.success}? ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET} (Arrows to navigate, Numbers to edit)`;

        // Format value function
        const formatVal = (side: Side) => {
            const isFocused = this.focus === side;
            const text = isFocused ? this.inputBuffer : this.values[side].toString();

            if (isFocused) {
                return `${ANSI.FG_CYAN}${ANSI.BOLD}[ ${text} ]${ANSI.RESET}`;
            }
            return `  ${text}  `;
        };

        const vTop = formatVal('top');
        const vRight = formatVal('right');
        const vBottom = formatVal('bottom');
        const vLeft = formatVal('left');

        // Layout
        //       [ Top ]
        // [ Left ]   [ Right ]
        //      [ Bottom ]

        // We need to pad to align them nicely. 
        // Simple manual padding for MVP.

        // Calculate center padding based on longest string? 
        // Keep it simple.

        let output = title + '\n\n';

        // Top Row (Centered)
        output += `          ${vTop}\n`;

        // Middle Row
        output += `  ${vLeft}     ${vRight}\n`;

        // Bottom Row
        output += `          ${vBottom}\n`;

        this.renderFrame(output);
    }

    protected handleMouse(event: MouseEvent) {
        if (event.name === 'mouse' && event.action === 'scroll') {
            const order: Side[] = ['top', 'right', 'bottom', 'left'];
            const idx = order.indexOf(this.focus);

            if (event.scroll === 'down') {
                // Next (Down usually means going forward/down in list)
                this.changeFocus(order[(idx + 1) % 4]);
            } else if (event.scroll === 'up') {
                // Previous
                this.changeFocus(order[(idx + 3) % 4]); // +3 is same as -1 in mod 4
            }
            this.render(false);
        }
    }

    protected handleInput(char: string, _key: Buffer) {
        // Enter -> Submit
        if (char === '\r' || char === '\n') {
            this.commitBuffer();
            this.submit(this.values);
            return;
        }

        // Navigation
        if (this.isUp(char)) {
            if (this.focus === 'bottom' || this.focus === 'left' || this.focus === 'right') {
                this.changeFocus('top');
            }
            this.render(false);
            return;
        }

        if (this.isDown(char)) {
            if (this.focus === 'top' || this.focus === 'left' || this.focus === 'right') {
                this.changeFocus('bottom');
            }
            this.render(false);
            return;
        }

        if (this.isLeft(char)) {
            if (this.focus === 'right' || this.focus === 'top' || this.focus === 'bottom') {
                this.changeFocus('left');
            }
            this.render(false);
            return;
        }

        if (this.isRight(char)) {
            if (this.focus === 'left' || this.focus === 'top' || this.focus === 'bottom') {
                this.changeFocus('right');
            }
            this.render(false);
            return;
        }

        // Tab Cycling
        if (char === '\t') {
            const order: Side[] = ['top', 'right', 'bottom', 'left'];
            const idx = order.indexOf(this.focus);
            this.changeFocus(order[(idx + 1) % 4]);
            this.render(false);
            return;
        }

        // Shift+Tab Cycling (\u001b[Z)
        if (char === '\u001b[Z') {
            const order: Side[] = ['top', 'right', 'bottom', 'left'];
            const idx = order.indexOf(this.focus);
            this.changeFocus(order[(idx + 3) % 4]); // (idx - 1) % 4 handling negative
            this.render(false);
            return;
        }

        // Increment/Decrement (+ / -)
        const step = this.options.step || 1;
        if (char === '+' || char === '=') { // = is usually unshifted +
            this.increment(step);
            this.render(false);
            return;
        }
        if (char === '-' || char === '_') {
            this.increment(-step);
            this.render(false);
            return;
        }

        // Typing Numbers
        if (/^[0-9]$/.test(char)) {
            // Special case: if buffer is "0", replace it unless we are appending
            if (this.inputBuffer === '0') {
                this.inputBuffer = char;
            } else {
                this.inputBuffer += char;
            }
            this.render(false);
            return;
        }

        // Backspace
        if (char === '\u0008' || char === '\x7f') {
            if (this.inputBuffer.length > 0) {
                this.inputBuffer = this.inputBuffer.slice(0, -1);
                if (this.inputBuffer === '') this.inputBuffer = '0'; // default to 0
            }
            this.render(false);
            return;
        }
    }
}
