import { spawn } from 'child_process';
import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { symbols } from '../symbols';
import { TerminalOptions } from '../types';
import { Layout, safeSplit, stringWidth } from '../utils';

export class TerminalPrompt extends Prompt<string, TerminalOptions> {
    private outputBuffer: string[] = [];
    private inputValue: string = '';
    private inputCursor: number = 0;
    private isRunning: boolean = false;
    private inputSegments: string[] = [];

    constructor(options: TerminalOptions) {
        super(options);
        // Initial welcome message
        if (options.allowedCommands) {
            this.outputBuffer.push(`${theme.muted}Allowed commands: ${options.allowedCommands.join(', ')}${ANSI.RESET}`);
        }
        this.outputBuffer.push(`${theme.muted}Type a command and press Enter. Ctrl+Enter to finish.${ANSI.RESET}`);
    }

    protected render(firstRender: boolean): void {
        const width = this.stdout.columns || 80;
        const maxHeight = this.options.maxHeight || 10;
        
        // 1. Render Output Viewport
        // Take last N lines
        let outputLines = this.outputBuffer;
        if (outputLines.length > maxHeight) {
            outputLines = outputLines.slice(outputLines.length - maxHeight);
        }
        
        let outputContent = outputLines.join('\n');
        // If empty, show some height
        if (outputLines.length === 0) {
            outputContent = `${theme.muted}(Terminal ready)${ANSI.RESET}`;
        }
        
        // 2. Render Input Line
        const cwd = this.options.cwd || process.cwd();
        const promptPrefix = `${ANSI.FG_BLUE}${cwd} $${ANSI.RESET} `;
        
        // Input logic similar to TextPrompt but simplified
        // We need to render segments and cursor
        let inputDisplay = '';
        this.inputValue = this.inputSegments.join('');
        
        inputDisplay = this.inputSegments.join('');
        
        const fullContent = `${outputContent}\n${theme.main}${symbols.horizontal.repeat(width)}${ANSI.RESET}\n${promptPrefix}${inputDisplay}`;

        this.renderFrame(fullContent);

        // Move cursor to correct position
        // Lines up = 0 (we are at bottom)
        // Column = prefix length + visual cursor position
        const prefixWidth = stringWidth(this.stripAnsi(promptPrefix));
        
        // Calculate visual cursor position
        let cursorVisualWidth = 0;
        for (let i = 0; i < this.inputCursor; i++) {
            cursorVisualWidth += stringWidth(this.inputSegments[i]);
        }
        
        const targetCol = prefixWidth + cursorVisualWidth;
        
        this.print('\r'); // Move to start of line
        if (targetCol > 0) {
            this.print(`\x1b[${targetCol}C`);
        }
    }

    protected handleInput(char: string, key: Buffer): void {
        if (this.isRunning) return; // Ignore input while running command

        // Ctrl+Enter to submit final result (last output or empty)
        // Detect Ctrl+Enter (often \n but depending on term, or key sequence)
        // Usually prompt handles Enter as standard. We need modifier check.
        // Node raw mode often sends \n or \r for Enter. 
        // We'll rely on a specific sequence or heuristic if needed.
        // For now, let's map a specific key or assume prompt doesn't easily distinguish Ctrl+Enter from Enter without 'keypress' event details which we have in `base.ts` but `handleInput` receives char/buffer.
        // Wait, `_onKeyHandler` in base receives (char, key). But `handleInput` sig in base is (char, buffer).
        // Let's check base.ts... 
        // `this._onKeyHandler = (char: string, buffer: Buffer) => { ... this.handleInput(char, buffer); }`
        // So we just have buffer. 
        // Let's use a workaround: Empty input + Enter = Submit? Or a specific command 'exit'?
        // The plan said "Ctrl+Enter". In many terminals, Ctrl+Enter sends `\n` vs `\r` or nothing special.
        // Let's implement: If input is 'exit' or 'submit', we finish.
        // Or if user presses standard Ctrl+D?
        
        if (char === '\u0004') { // Ctrl+D
             this.submit(this.outputBuffer.join('\n'));
             return;
        }

        // Enter: Run command
        if (char === '\r' || char === '\n') {
            const cmd = this.inputSegments.join('').trim();
            if (!cmd) return;
            
            this.inputSegments = [];
            this.inputCursor = 0;
            this.runCommand(cmd);
            return;
        }

        // Backspace
        if (char === '\u0008' || char === '\x7f') {
            if (this.inputCursor > 0) {
                this.inputSegments.splice(this.inputCursor - 1, 1);
                this.inputCursor--;
                this.render(false);
            }
            return;
        }

        // Left/Right
        if (this.isLeft(char)) {
            if (this.inputCursor > 0) {
                this.inputCursor--;
                this.render(false);
            }
            return;
        }
        if (this.isRight(char)) {
            if (this.inputCursor < this.inputSegments.length) {
                this.inputCursor++;
                this.render(false);
            }
            return;
        }

        // Typing
        if (!/^[\x00-\x1F]/.test(char) && !char.startsWith('\x1b')) {
            const newSegs = safeSplit(char);
            this.inputSegments.splice(this.inputCursor, 0, ...newSegs);
            this.inputCursor += newSegs.length;
            this.render(false);
        }
    }

    private runCommand(cmd: string) {
        // Validation
        if (this.options.allowedCommands) {
            const cmdName = cmd.split(' ')[0];
            if (!this.options.allowedCommands.includes(cmdName)) {
                this.outputBuffer.push(`${ANSI.FG_RED}Command not allowed: ${cmdName}${ANSI.RESET}`);
                this.render(false);
                return;
            }
        }

        this.isRunning = true;
        this.outputBuffer.push(`${theme.muted}> ${cmd}${ANSI.RESET}`);
        this.render(false); // Update UI before pausing

        this.pauseInput();

        const child = spawn(cmd, {
            shell: true,
            cwd: this.options.cwd || process.cwd(),
            stdio: ['ignore', 'pipe', 'pipe']
        });

        child.stdout.on('data', (data) => {
            const lines = data.toString().split('\n');
            // Handle trailing empty line from split
            if (lines.length > 0 && lines[lines.length-1] === '') lines.pop();
            this.outputBuffer.push(...lines);
            // Re-render to show progress
            this.render(false);
        });

        child.stderr.on('data', (data) => {
             const lines = data.toString().split('\n');
             if (lines.length > 0 && lines[lines.length-1] === '') lines.pop();
             this.outputBuffer.push(...lines.map((l: string) => `${ANSI.FG_RED}${l}${ANSI.RESET}`));
             // Re-render to show progress
             this.render(false);
        });

        child.on('close', (code) => {
            this.isRunning = false;
            this.outputBuffer.push(`${theme.muted}Exited with code ${code}${ANSI.RESET}`);
            
            // Resume
            this.resumeInput();
            this.render(false);
        });
        
        child.on('error', (err) => {
            this.isRunning = false;
            this.outputBuffer.push(`${ANSI.FG_RED}Error: ${err.message}${ANSI.RESET}`);
            this.resumeInput();
            this.render(false);
        });
    }
}
