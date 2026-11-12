import { ANSI } from './ansi';
import { symbols } from './symbols';
import { theme } from './theme';

/**
 * Visual style used when {@link Spinner.stop} writes its final message.
 *
 * - `success`: green tick prefix
 * - `error`: red cross prefix
 * - `info`: main colour info prefix
 */
export type SpinnerStopType = 'success' | 'error' | 'info';

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
     * Stops the spinner animation and replaces the current line with a final
     * message.
     *
     * The line is always terminated with a newline, so output written after
     * stopping starts on a fresh line. When no `message` is given, the spinner's
     * current text is kept. Calling `stop()` when the spinner is not running is a
     * no-op.
     *
     * @param message - Final message shown in place of the animation frame.
     * @param type - Optional style prefix: `success`, `error`, or `info`.
     */
    public stop(message?: string, type?: SpinnerStopType): this {
        if (!this.halt()) return this;

        const text = message ?? this.text;
        let prefix = '';

        if (type === 'success') {
            prefix = `${theme.success}${symbols.tick}${ANSI.RESET} `;
        } else if (type === 'error') {
            prefix = `${theme.error}${symbols.cross}${ANSI.RESET} `;
        } else if (type === 'info') {
            prefix = `${theme.main}${symbols.info}${ANSI.RESET} `;
        }

        process.stdout.write(`${ANSI.ERASE_LINE}${ANSI.CURSOR_LEFT}${prefix}${text}\n`);
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
        this.halt();
        const text = message ?? this.text;
        process.stdout.write(
            `${ANSI.ERASE_LINE}${ANSI.CURSOR_LEFT}${theme.success}${symbols.tick}${ANSI.RESET} ${text}\n`,
        );
        return this;
    }

    /**
     * Stops the spinner and shows an error message.
     */
    public error(message?: string): this {
        this.halt();
        const text = message ?? this.text;
        process.stdout.write(
            `${ANSI.ERASE_LINE}${ANSI.CURSOR_LEFT}${theme.error}${symbols.cross}${ANSI.RESET} ${text}\n`,
        );
        return this;
    }

    /**
     * Stops the spinner and clears the line.
     */
    public clear(): this {
        this.halt();
        process.stdout.write(`${ANSI.ERASE_LINE}${ANSI.CURSOR_LEFT}`);
        return this;
    }

    /**
     * Stops the animation loop and restores the terminal cursor.
     *
     * @returns `true` when the spinner was running and has been stopped.
     */
    private halt(): boolean {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }

        if (!this.isSpinning) return false;

        this.isSpinning = false;
        process.stdout.write(ANSI.SHOW_CURSOR);
        process.removeListener('SIGINT', this.handleSignal);
        return true;
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
