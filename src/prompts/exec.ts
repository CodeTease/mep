import { spawn, ChildProcess } from 'child_process';
import { Prompt } from '../base';
import { ExecOptions } from '../types';
import { theme } from '../theme';
import { symbols } from '../symbols';
import { ANSI } from '../ansi';

export class ExecPrompt extends Prompt<void, ExecOptions> {
    private child?: ChildProcess;
    private status: 'running' | 'done' | 'error' = 'running';
    private timer?: NodeJS.Timeout;
    private stdoutBuffer: string = '';
    private stderrBuffer: string = '';
    private lastLogLine: string = '';

    constructor(options: ExecOptions) {
        super(options);
        // Experimental warning removed
    }

    public run(): Promise<void> {
        this.child = spawn(this.options.command, [], {
            cwd: this.options.cwd || process.cwd(),
            shell: true,
            // Use 'ignore' for stdin so parent keeps control (and raw mode).
            // Use 'pipe' for stdout/stderr to capture output.
            stdio: ['ignore', 'pipe', 'pipe']
        });

        // Capture stdout
        if (this.child.stdout) {
            this.child.stdout.on('data', (data: Buffer) => {
                const chunk = data.toString();
                this.stdoutBuffer += chunk;
                this.updateLastLogLine(chunk);
            });
        }

        // Capture stderr
        if (this.child.stderr) {
            this.child.stderr.on('data', (data: Buffer) => {
                const chunk = data.toString();
                this.stderrBuffer += chunk;
                this.updateLastLogLine(chunk);
            });
        }

        if (this.options.timeout && this.options.timeout > 0) {
            this.timer = setTimeout(() => {
                if (this.status !== 'running') return;
                this.status = 'error';
                this.render(false);
                this.killChild();
                this.cancel(new Error(`Timeout after ${this.options.timeout}ms`));
            }, this.options.timeout);
        }

        this.child.on('exit', (code) => {
            if (this.status !== 'running') return;
            
            if (code === 0) {
                this.status = 'done';
                this.render(false);
                this.submit();
            } else {
                this.status = 'error';
                this.render(false);
                
                const errorMessage = this.stderrBuffer.trim() || `Command failed with exit code ${code}`;
                const err = new Error(errorMessage);
                // Attach details
                Object.assign(err, {
                    code,
                    stdout: this.stdoutBuffer,
                    stderr: this.stderrBuffer
                });
                
                this.cancel(err);
            }
        });

        this.child.on('error', (err) => {
            if (this.status !== 'running') return;
            this.status = 'error';
            this.render(false);
            this.cancel(err);
        });

        return super.run();
    }

    private updateLastLogLine(chunk: string) {
        // We only want the last non-empty line
        const lines = chunk.split('\n');
        // Iterate backwards
        for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i].trim();
            if (line) {
                this.lastLogLine = line;
                this.render(false);
                break;
            }
        }
    }

    private killChild() {
        if (this.child && !this.child.killed) {
            this.child.kill();
        }
    }

    protected cleanup() {
        this.status = 'done';
        if (this.timer) clearTimeout(this.timer);
        this.killChild();
        super.cleanup();
    }

    protected render(_firstRender: boolean) {
        let symbol = '';

        if (this.status === 'running') {
            symbol = theme.muted + '...' + ANSI.RESET;
        } else if (this.status === 'done') {
            symbol = theme.success + symbols.tick + ANSI.RESET;
        } else if (this.status === 'error') {
            symbol = theme.error + symbols.cross + ANSI.RESET;
        }

        let details = '';
        if (this.status === 'running' && this.lastLogLine) {
            // Truncate for display
            const maxLen = 50;
            let line = this.stripAnsi(this.lastLogLine);
            if (line.length > maxLen) {
                line = line.substring(0, maxLen - 3) + '...';
            }
            details = ` ${theme.muted}${line}${ANSI.RESET}`;
        }

        const output = `${theme.title}${this.options.message}${ANSI.RESET} ${symbol}${details}`;
        this.renderFrame(output);
    }

    protected handleInput(_char: string, _key: Buffer) {
        // Prompt base class handles Ctrl+C (SIGINT) in _onKeyHandler
        // which calls cleanup() -> killChild().
    }
}
