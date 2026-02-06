import { ANSI } from './ansi';
import { symbols } from './symbols';
import { theme } from './theme';

export class Spinner {
    private text: string;
    private timer?: NodeJS.Timeout;
    private frameIndex: number = 0;
    private isSpinning: boolean = false;

    constructor(text: string) {
        this.text = text;
    }

    /**
     * Starts the spinner animation.
     */
    public start(): this {
        if (this.isSpinning) return this;

        this.isSpinning = true;
        process.stdout.write(ANSI.HIDE_CURSOR);

        // Render immediately
        this.render();

        // Start loop
        this.timer = setInterval(() => {
            this.render();
        }, 80);

        // Register signal handler to restore cursor on Ctrl+C
        process.on('SIGINT', this.handleSignal);

        return this;
    }

    /**
     * Stops the spinner animation.
     */
    public stop(): this {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }

        if (this.isSpinning) {
            this.isSpinning = false;
            process.stdout.write(ANSI.SHOW_CURSOR);
            process.removeListener('SIGINT', this.handleSignal);
        }

        return this;
    }

    /**
     * Updates the spinner text.
     */
    public update(text: string): this {
        this.text = text;
        return this;
    }

    /**
     * Stops the spinner and shows a success message.
     */
    public success(message?: string): this {
        this.stop();
        const text = message ?? this.text;
        process.stdout.write(`${ANSI.ERASE_LINE}${ANSI.CURSOR_LEFT}${theme.success}${symbols.tick}${ANSI.RESET} ${text}\n`);
        return this;
    }

    /**
     * Stops the spinner and shows an error message.
     */
    public error(message?: string): this {
        this.stop();
        const text = message ?? this.text;
        process.stdout.write(`${ANSI.ERASE_LINE}${ANSI.CURSOR_LEFT}${theme.error}${symbols.cross}${ANSI.RESET} ${text}\n`);
        return this;
    }

    /**
     * Stops the spinner and clears the line.
     */
    public clear(): this {
        this.stop();
        process.stdout.write(`${ANSI.ERASE_LINE}${ANSI.CURSOR_LEFT}`);
        return this;
    }

    private render(): void {
        const frame = symbols.spinner[this.frameIndex];
        process.stdout.write(`${ANSI.ERASE_LINE}${ANSI.CURSOR_LEFT}${theme.main}${frame}${ANSI.RESET} ${this.text}`);
        this.frameIndex = (this.frameIndex + 1) % symbols.spinner.length;
    }

    private handleSignal = () => {
        this.stop();
        process.exit(0);
    };
}
