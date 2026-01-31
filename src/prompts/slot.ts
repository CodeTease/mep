import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { symbols } from '../symbols';
import { SlotOptions } from '../types';
import { stringWidth } from '../utils';

export class SlotPrompt extends Prompt<string, SlotOptions> {
    private selectedIndex: number;
    private isSpinning: boolean = false;
    private isStopping: boolean = false;
    private spinSpeed: number = 50; // Initial speed (ms)
    private spinTimer?: NodeJS.Timeout;
    private rows: number;

    constructor(options: SlotOptions) {
        super(options);
        this.rows = options.rows || 3;
        // Ensure rows is odd to have a center
        if (this.rows % 2 === 0) this.rows++;
        this.selectedIndex = options.initial || 0;
    }

    private spin() {
        if (!this.isSpinning) return;

        this.selectedIndex = (this.selectedIndex + 1) % this.options.choices.length;
        this.render(false);

        if (this.isStopping) {
            // Deceleration physics
            this.spinSpeed = Math.floor(this.spinSpeed * 1.1);
            if (this.spinSpeed > 400) {
                this.isSpinning = false;
                this.finish();
                return;
            }
        }

        this.spinTimer = setTimeout(() => this.spin(), this.spinSpeed);
    }

    private finish() {
        if (this.spinTimer) clearTimeout(this.spinTimer);
        this.submit(this.options.choices[this.selectedIndex]);
    }

    protected handleInput(char: string, key: Buffer) {
        if (char === ' ' || char === '\r' || char === '\n') {
            if (!this.isSpinning) {
                // Start spinning
                this.isSpinning = true;
                this.isStopping = false;
                this.spinSpeed = 50; // Reset speed
                this.spin();
            } else if (!this.isStopping) {
                // Initiate stop sequence
                this.isStopping = true;
            }
        }
    }

    protected render(firstRender: boolean) {
        let output = '';
        
        // Header
        output += `${theme.success}?${ANSI.RESET} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET}\n`;

        // Calculate dynamic width
        const maxLen = Math.max(...this.options.choices.map(c => stringWidth(c)));
        const boxWidth = Math.max(20, maxLen + 6);

        const border = symbols.line.repeat(boxWidth - 2);
        output += `┌${border}┐\n`;

        const centerRow = Math.floor(this.rows / 2);

        for (let i = 0; i < this.rows; i++) {
            const offset = i - centerRow;
            let index = (this.selectedIndex + offset) % this.options.choices.length;
            if (index < 0) index += this.options.choices.length;

            const item = this.options.choices[index];
            const content = this.truncate(item, boxWidth - 4);
            const contentWidth = stringWidth(content);
            const padding = boxWidth - 4 - contentWidth;
            const leftPad = ' '.repeat(Math.floor(padding / 2));
            const rightPad = ' '.repeat(Math.ceil(padding / 2));

            const lineContent = `${leftPad}${content}${rightPad}`;

            if (i === centerRow) {
                // Highlight
                output += `│ ${theme.main}${ANSI.REVERSE} ${lineContent} ${ANSI.RESET} │ ${theme.main}◄${ANSI.RESET}\n`;
            } else {
                output += `│  ${lineContent}  │\n`;
            }
        }

        output += `└${border}┘`;

        // Instructions
        if (!this.isSpinning) {
            output += `\n${theme.muted}(Press Space/Enter to Spin)${ANSI.RESET}`;
        } else if (this.isStopping) {
            output += `\n${theme.muted}(Stopping...)${ANSI.RESET}`;
        } else {
            output += `\n${theme.muted}(Press Space/Enter to Stop)${ANSI.RESET}`;
        }

        this.renderFrame(output);
    }
    
    // Override cleanup to ensure timer is cleared if user Ctrl+C
    protected cleanup() {
        if (this.spinTimer) clearTimeout(this.spinTimer);
        super.cleanup();
    }
}
