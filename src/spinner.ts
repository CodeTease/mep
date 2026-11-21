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

/**
 * Returns `true` for write failures caused by a reader that went away, such as
 * `| head` closing the pipe.
 */
const isClosedStreamError = (error: unknown): boolean => {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    return code === 'EPIPE' || code === 'ERR_STREAM_DESTROYED';
};

export class Spinner {
    private static running = new Set<Spinner>();
    private static guardAttached = false;
    private static guardRemoval?: NodeJS.Immediate;

    private text: string;
    private timer?: NodeJS.Timeout;
    private frameIndex: number = 0;
    private isSpinning: boolean = false;
    private isStreamClosed: boolean = false;

    constructor(text: string) {
        this.text = text;
    }

    /**
     * Starts the spinner animation.
     */
    public start(): this {
        if (this.isSpinning) return this;

        this.isSpinning = true;
        this.isStreamClosed = false;
        Spinner.attachGuard(this);
        this.write(ANSI.HIDE_CURSOR);
        this.render();

        // A synchronous write failure stops the spinner before it ever runs.
        if (!this.isSpinning) return this;

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

        this.write(`${ANSI.ERASE_LINE}${ANSI.CURSOR_LEFT}${prefix}${text}\n`);
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
        this.write(`${ANSI.ERASE_LINE}${ANSI.CURSOR_LEFT}${theme.success}${symbols.tick}${ANSI.RESET} ${text}\n`);
        return this;
    }

    /**
     * Stops the spinner and shows an error message.
     */
    public error(message?: string): this {
        this.halt();
        const text = message ?? this.text;
        this.write(`${ANSI.ERASE_LINE}${ANSI.CURSOR_LEFT}${theme.error}${symbols.cross}${ANSI.RESET} ${text}\n`);
        return this;
    }

    /**
     * Stops the spinner and clears the line.
     */
    public clear(): this {
        this.halt();
        this.write(`${ANSI.ERASE_LINE}${ANSI.CURSOR_LEFT}`);
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

        Spinner.detachGuard(this);

        if (!this.isSpinning) return false;

        this.isSpinning = false;
        this.write(ANSI.SHOW_CURSOR);
        process.removeListener('SIGINT', this.handleSignal);
        return true;
    }

    private render(): void {
        if (!this.isSpinning) return;

        const frame = symbols.spinner[this.frameIndex];
        this.write(`${ANSI.ERASE_LINE}${ANSI.CURSOR_LEFT}${theme.main}${frame}${ANSI.RESET} ${this.text}`);
        this.frameIndex = (this.frameIndex + 1) % symbols.spinner.length;
    }

    /**
     * Writes to stdout, ignoring failures caused by a closed reader.
     */
    private write(output: string): void {
        if (this.isStreamClosed) return;

        try {
            process.stdout.write(output);
        } catch (error) {
            if (!isClosedStreamError(error)) throw error;
            this.handleStreamClosed();
        }
    }

    private handleStreamClosed(): void {
        this.isStreamClosed = true;
        // halt() skips the cursor restore because the stream is gone.
        this.halt();
    }

    private static attachGuard(spinner: Spinner): void {
        if (Spinner.guardRemoval) {
            clearImmediate(Spinner.guardRemoval);
            Spinner.guardRemoval = undefined;
        }

        Spinner.running.add(spinner);

        if (Spinner.guardAttached) return;

        Spinner.guardAttached = true;
        process.stdout.on('error', Spinner.handleStreamError);
    }

    private static detachGuard(spinner: Spinner): void {
        Spinner.running.delete(spinner);
        if (Spinner.running.size > 0 || Spinner.guardRemoval || !Spinner.guardAttached) return;

        // Write failures are reported asynchronously, so keep the guard for one
        // more turn; removing it in the same tick can leave a late EPIPE
        // unhandled, which aborts the process.
        Spinner.guardRemoval = setImmediate(() => {
            Spinner.guardRemoval = undefined;
            if (Spinner.running.size > 0) return;

            Spinner.guardAttached = false;
            process.stdout.removeListener('error', Spinner.handleStreamError);
        });
    }

    private static handleStreamError = (error: NodeJS.ErrnoException): void => {
        if (isClosedStreamError(error)) {
            // Copy first: stopping a spinner removes it from the set.
            for (const spinner of [...Spinner.running]) spinner.handleStreamClosed();
            return;
        }

        // Keep the default crash for unrelated failures when no host handler
        // is listening.
        if (process.stdout.listenerCount('error') === 1) throw error;
    };

    private handleSignal = () => {
        // Host handlers (cleanup, telemetry, ...) may be registered after
        // `start()`; they decide whether Ctrl+C is handled, so only stop here.
        const hasOtherListeners = process.listenerCount('SIGINT') > 1;

        this.stop();

        if (hasOtherListeners) return;

        // Let every other SIGINT listener run before terminating, then report
        // the conventional interrupt status instead of a successful exit.
        setImmediate(() => {
            if (process.exitCode !== undefined) return;
            process.exit(130);
        });
    };
}
