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

        const logger = (type: string) => (...args: any[]) => {
             // Use util.format for proper string interpolation
             // eslint-disable-next-line @typescript-eslint/no-var-requires
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
        if (this.lastOutputHeight > 0) {
            output += `\x1b[${this.lastOutputHeight}A`; // Move up N lines
            output += '\r'; // Move to start of line
        }

        // 3. Diffing & Overwrite
        for (let i = 0; i < lines.length; i++) {
            const newLine = lines[i];
            
            // Optimization: Only rewrite if changed (though with spinner, it often changes)
            // But we must move cursor down regardless if we skip writing
            
            if (i < this.lastOutputLines.length) {
                 if (newLine !== this.lastOutputLines[i]) {
                     output += ANSI.ERASE_LINE + newLine;
                 } else {
                     // Even if line is same, we might need to move cursor down if we are not writing?
                     // Actually, easiest strategy for multi-line fixed block is just rewrite 
                     // OR use explicit moves.
                     
                     // If we don't write, the cursor stays at start of this line.
                     // We need to move down for next iteration.
                     // BUT, if we write, the cursor ends at end of line (usually).
                     // So we should just erase and rewrite to be safe and simple, 
                     // unless we want complex cursor management.
                     
                     // Let's stick to "Move Down" if same, "Erase+Write" if diff.
                     // But wait, if we moved UP at the start, we are at line 0.
                     
                     // Refined Logic:
                     // We are at line `i` (relative to start of block).
                     // If match: move down 1 line.
                     // If diff: erase line, write content, then move to next line?
                     // Standard terminals: writing \n moves down.
                     // But we want to control it tightly.
                     
                     // Let's use the Base.ts approach: 
                     // It writes the line.
                     // Between lines it does `\n` (if appending) or `\x1b[B` (if moving down existing).
                 }
            } else {
                // Appending new lines
                 output += '\n' + newLine;
                 continue; 
            }
            
            // Move to next line if not last
            if (i < lines.length - 1) {
                // If we wrote something, we might be at end of line. 
                // If we didn't write, we are at start.
                // It's safer to always use explicit "Down + CR"
                
                if (newLine !== this.lastOutputLines[i]) {
                    // We just wrote a line. Ideally usage of \n is implicit if we wrapped, 
                    // but we truncated.
                    // Let's just output \n to go down? 
                    // No, that might scroll if at bottom.
                    output += '\n'; 
                } else {
                    // We skipped writing. Move down.
                    output += '\x1b[B\r';
                }
            }
        }
        
        // Re-simplifying logic to match `Prompt.renderFrame` roughly:
        // Actually, since this is a dedicated runner, let's just do the "Erase + Rewrite All" 
        // if *any* line changed, or careful per-line.
        // Given `base.ts` logic:
        
        output = '';
        if (this.lastOutputHeight > 0) {
            output += `\x1b[${this.lastOutputHeight}A`; // Up
            output += '\r'; 
        }

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
