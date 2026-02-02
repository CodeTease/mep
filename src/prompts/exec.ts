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

    constructor(options: ExecOptions) {
        super(options);
        this.warnExperimental();
    }

    public run(): Promise<void> {
        this.child = spawn(this.options.command, [], {
            cwd: this.options.cwd || process.cwd(),
            shell: true,
            stdio: this.options.streamOutput ? 'inherit' : 'ignore'
        });

        if (this.options.timeout && this.options.timeout > 0) {
            this.timer = setTimeout(() => {
                if (this.status !== 'running') return;
                this.status = 'error';
                this.render(false);
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
                this.cancel(new Error(`Command failed with exit code ${code}`));
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

        const output = `${theme.title}${this.options.message}${ANSI.RESET} ${symbol}`;
        this.renderFrame(output);
    }

    protected handleInput(_char: string, _key: Buffer) {
        // Ignore input
    }
}
