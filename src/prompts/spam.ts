import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { symbols } from '../symbols'; // Assuming you add a 'block' symbol or use unicode
import { BaseOptions } from '../types';

interface SpamOptions extends BaseOptions {
    threshold: number; // Number of presses required
    spamKey?: string; // Default to 'space' or generic 'any'
    decay?: boolean; // Evil mode: progress drops if you stop spamming!
}

export class SpamPrompt extends Prompt<boolean, SpamOptions> {
    private count: number = 0;
    private width: number = 20; // Visual width of the bar
    private decayTimer?: NodeJS.Timeout;

    constructor(options: SpamOptions) {
        super(options);
        
        if (options.decay) {
            this.decayTimer = setInterval(() => {
                if (this.count > 0) {
                    this.count = Math.max(0, this.count - 1);
                    this.render(false);
                }
            }, 200); // Drop 5 presses per second
        }
    }

    protected cleanup() {
        if (this.decayTimer) clearInterval(this.decayTimer);
        super.cleanup();
    }

    protected render(firstRender: boolean) {
        const progress = Math.min(this.count / this.options.threshold, 1);
        const filledLen = Math.round(progress * this.width);
        const emptyLen = this.width - filledLen;

        // Visual Bar: [#####-----]
        const filled = symbols.line.repeat(filledLen).replace(/./g, '#'); // Or use block char
        const empty = symbols.line.repeat(emptyLen);
        
        const barColor = progress === 1 ? theme.success : theme.error;
        const bar = `${theme.muted}[${barColor}${filled}${theme.muted}${empty}]${ANSI.RESET}`;

        let output = `${theme.error}${symbols.cross} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET}\n`;
        output += `  ${bar} ${Math.floor(progress * 100)}%`;
        
        if (this.count >= this.options.threshold) {
             output += ` ${theme.success} READY! Press Enter${ANSI.RESET}`;
        } else {
             output += ` ${theme.muted}(Mash '${this.options.spamKey || 'Space'}' to fill)${ANSI.RESET}`;
        }

        this.renderFrame(output);
    }

    protected handleInput(char: string) {
        // Confirm execution
        if (this.count >= this.options.threshold && (char === '\r' || char === '\n')) {
            this.submit(true);
            return;
        }

        const trigger = this.options.spamKey || ' ';
        
        // Check if key matches (or any key if not specified)
        if (char === trigger) {
             if (this.count < this.options.threshold) {
                 this.count++;
                 this.render(false);
             }
        }
    }
}