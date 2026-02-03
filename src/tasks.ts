import { ANSI } from './ansi';
import { symbols } from './symbols';
import { TaskConfig, TaskGroupOptions, TaskState } from './types';
import { generateProgressBar } from './utils';

export class TaskRunner {
    private tasks: Map<string, TaskState> = new Map();
    private options: TaskGroupOptions;
    private timer?: NodeJS.Timeout;
    private frameIndex: number = 0;
    private isRunning: boolean = false;
    private lastOutputLines: string[] = [];
    private lastOutputHeight: number = 0;
    
    // Explicitly using stdout
    private stdout: NodeJS.WriteStream = process.stdout;

    // Console Hijacking
    private originalConsole: { log: any, warn: any, error: any } | null = null;
    private logBuffer: string[] = [];

    constructor(options: TaskGroupOptions = {}) {
        this.options = options;
        this.handleSigInt = this.handleSigInt.bind(this);
    }

    /**
     * Registers a new task.
     */
    public add(id: string, config: Omit<TaskConfig, 'id'>): TaskRunner {
        this.tasks.set(id, {
            id,
            ...config,
            status: 'pending',
            current: 0,
        });
        return this;
    }

    /**
     * Updates an existing task.
     */
    public update(id: string, updates: Partial<Omit<TaskState, 'id' | 'type' | 'title'>> & { title?: string }): void {
        const task = this.tasks.get(id);
        if (task) {
            Object.assign(task, updates);
        }
    }

    /**
     * Starts a task (sets status to loading).
     */
    public start(id: string, message?: string): void {
        this.update(id, { status: 'loading', message });
    }

    /**
     * Mark task as success.
     */
    public success(id: string, message?: string): void {
        this.update(id, { status: 'success', message });
    }

    /**
     * Mark task as error.
     */
    public error(id: string, message?: string): void {
        this.update(id, { status: 'error', message });
    }

    /**
     * Mark task as warning.
     */
    public warning(id: string, message?: string): void {
        this.update(id, { status: 'warning', message });
    }

    /**
     * Starts the rendering loop.
     */
    public run(): void {
        if (this.isRunning) return;
        this.isRunning = true;
        
        this.stdout.write(ANSI.HIDE_CURSOR);
        this.hijackConsole();
        
        // Handle Ctrl+C gracefully to restore cursor
        process.on('SIGINT', this.handleSigInt);

        // Initial render
        this.render();

        this.timer = setInterval(() => {
            this.frameIndex++;
            this.render();
        }, 80);
    }

    /**
     * Stops the rendering loop and finalizes output.
     */
    public stop(): void {
        if (!this.isRunning) return;
        
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }

        // Final render to ensure static state (ticks/crosses instead of spinner)
        this.render();

        this.isRunning = false;
        this.restoreConsole();
        this.stdout.write(ANSI.SHOW_CURSOR + '\n');
        
        if (this.logBuffer.length > 0) {
            this.stdout.write(this.logBuffer.join('\n') + '\n');
            this.logBuffer = [];
        }

        process.removeListener('SIGINT', this.handleSigInt);
    }

    private handleSigInt = () => {
        this.restoreConsole();
        this.stdout.write(ANSI.SHOW_CURSOR + '\n');
        process.exit(0);
    };

    private hijackConsole() {
        this.originalConsole = {
            log: console.log,
            warn: console.warn,
            error: console.error
        };

        const logger = (_type: string) => (...args: any[]) => {
             // Use util.format for proper string interpolation
             // eslint-disable-next-line @typescript-eslint/no-require-imports
             const util = require('util');
             const msg = util.format(...args);
             this.logBuffer.push(msg);
        };

        console.log = logger('log');
        console.warn = logger('warn');
        console.error = logger('error');
    }

    private restoreConsole() {
        if (this.originalConsole) {
            console.log = this.originalConsole.log;
            console.warn = this.originalConsole.warn;
            console.error = this.originalConsole.error;
            this.originalConsole = null;
        }
    }

    /**
     * The core rendering logic using Linear Scan Diffing.
     */
    private render(): void {
        const lines = this.buildLines();
        
        // 1. First Render
        if (this.lastOutputLines.length === 0) {
            this.stdout.write(lines.join('\n'));
            this.lastOutputLines = lines;
            this.lastOutputHeight = lines.length;
            return;
        }

        let output = '';

        // 2. Return Cursor to Top
        if (this.lastOutputHeight > 1) {
            output += `\x1b[${this.lastOutputHeight - 1}A`; // Move up N-1 lines
        }
        output += '\r'; // Move to start of line

        for (let i = 0; i < lines.length; i++) {
            const newLine = lines[i];
            // Write line
            output += ANSI.ERASE_LINE + newLine;
            if (i < lines.length - 1) {
                output += '\n';
            }
        }
        
        // Clear garbage if shrunk
        if (lines.length < this.lastOutputLines.length) {
            output += ANSI.ERASE_DOWN;
        }

        this.stdout.write(output);
        this.lastOutputLines = lines;
        this.lastOutputHeight = lines.length;
    }

    private buildLines(): string[] {
        const lines: string[] = [];
        
        for (const task of this.tasks.values()) {
            const icon = this.getIcon(task);
            const title = task.title;
            
            let line = `${icon} ${title}`;
            
            if (task.type === 'progress' && task.total) {
                const bar = generateProgressBar(task.current, task.total);
                line += ` ${ANSI.FG_GRAY}${bar}${ANSI.RESET}`;
            }

            if (task.message) {
                 line += ` ${ANSI.DIM}- ${task.message}${ANSI.RESET}`;
            }
            
            lines.push(line);
        }
        
        return lines;
    }

    private getIcon(task: TaskState): string {
        switch (task.status) {
            case 'pending':
                return `${ANSI.FG_GRAY}${symbols.unchecked}${ANSI.RESET}`;
            case 'loading': {
                const frame = symbols.spinner[this.frameIndex % symbols.spinner.length];
                return `${ANSI.FG_CYAN}${frame}${ANSI.RESET}`;
            }
            case 'success':
                return `${ANSI.FG_GREEN}${symbols.tick}${ANSI.RESET}`;
            case 'error':
                return `${ANSI.FG_RED}${symbols.cross}${ANSI.RESET}`;
            case 'warning':
                return `${ANSI.FG_YELLOW}!${ANSI.RESET}`;
            default:
                return ' ';
        }
    }
}
