// src/prompts/wait.ts
import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { BaseOptions } from '../types';

interface WaitOptions extends BaseOptions {
    seconds: number;
    autoSubmit?: boolean; // If true, resolves automatically when time is up
}

export class WaitPrompt extends Prompt<void, WaitOptions> {
    private remaining: number;
    private timer?: NodeJS.Timeout;
    private isDone: boolean = false;

    constructor(options: WaitOptions) {
        super(options);
        this.remaining = options.seconds;
    }

    public run(): Promise<void> {
        // Start the countdown immediately upon running
        this.timer = setInterval(() => {
            this.remaining--;
            if (this.remaining <= 0) {
                this.isDone = true;
                this.stopTimer();

                if (this.options.autoSubmit) {
                    this.submit();
                } else {
                    this.render(false);
                }
            } else {
                this.render(false);
            }
        }, 1000);

        return super.run();
    }

    private stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
    }

    protected cleanup() {
        this.stopTimer();
        super.cleanup();
    }

    protected render(_firstRender: boolean) {
        let output = `${theme.title}${this.options.message}${ANSI.RESET} `;

        if (this.isDone) {
            output += `${theme.success}Done! Press Enter to continue.${ANSI.RESET}`;
        } else {
            // Fun countdown visualization
            output += `${theme.muted}Please wait... ${this.remaining}s${ANSI.RESET}`;
        }

        this.renderFrame(output);
    }

    protected handleInput(char: string) {
        if (this.isDone && (char === '\r' || char === '\n')) {
            this.submit();
        }
        // Else: Ignore all input while waiting
    }
}