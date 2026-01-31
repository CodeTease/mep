import { ANSI } from './ansi';
import { InputParser } from './input';
import { BaseOptions, MouseEvent } from './types';
import { detectCapabilities, stringWidth, stripAnsi } from './utils';

/**
 * Abstract base class for all prompts.
 * Implements a Robust Linear Scan Diffing Engine.
 */
export abstract class Prompt<T, O> {
    protected options: O;
    protected value: any;
    protected stdin: NodeJS.ReadStream;
    protected stdout: NodeJS.WriteStream;
    private _resolve?: (value: T | PromiseLike<T>) => void;
    private _reject?: (reason?: any) => void;
    private _inputParser: InputParser;
    private _onKeyHandler?: (char: string, key: Buffer) => void;
    private _onDataHandler?: (chunk: Buffer) => void;
    private static warnedComponents = new Set<string>();

    protected lastRenderLines: string[] = [];
    protected lastRenderHeight: number = 0;
    
    protected capabilities: ReturnType<typeof detectCapabilities>;

    constructor(options: O) {
        this.options = options;
        this.stdin = process.stdin;
        this.stdout = process.stdout;
        this._inputParser = new InputParser();
        this.capabilities = detectCapabilities();
    }

    /**
     * Checks if running on Windows and logs a warning message once per component type.
     * Call this in the constructor of problematic prompts.
     */
    protected checkWindowsAttention() {
        const componentName = this.constructor.name;

        // Check platform and if already warned
        if (process.platform === 'win32' && !Prompt.warnedComponents.has(componentName)) {
            console.warn(
                `${ANSI.FG_YELLOW}Warning:${ANSI.RESET} ${componentName} may hang on Windows TTY after multiple cycles. ` +
                `Press 'Enter' if unresponsive.`
            );
            Prompt.warnedComponents.add(componentName);
        }
    }

    protected abstract render(firstRender: boolean): void;
    protected abstract handleInput(char: string, key: Buffer): void;
    protected handleMouse(_event: MouseEvent): void {}

    protected print(text: string) {
        this.stdout.write(text);
    }

    public run(): Promise<T> {
        return new Promise((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;

            if (typeof this.stdin.setRawMode === 'function') {
                this.stdin.setRawMode(true);
            }
            this.stdin.resume();
            this.stdin.setEncoding('utf8');

            const shouldEnableMouse = (this.options as BaseOptions).mouse !== false && this.capabilities.hasMouse;
            if (shouldEnableMouse) {
                this.print(ANSI.SET_ANY_EVENT_MOUSE + ANSI.SET_SGR_EXT_MODE_MOUSE);
            }

            this.print(ANSI.HIDE_CURSOR);
            
            // Initial render
            this.render(true);

            this._onKeyHandler = (char: string, buffer: Buffer) => {
                if (char === '\u0003') { // Ctrl+C
                    this.cleanup();
                    this.print(ANSI.SHOW_CURSOR + '\n');
                    if (this._reject) this._reject(new Error('User force closed'));
                    return;
                }
                this.handleInput(char, buffer);
            };

            this._inputParser.on('keypress', this._onKeyHandler);
            
            this._inputParser.on('mouse', (event: MouseEvent) => {
                this.handleMouse(event);
            });

            this._onDataHandler = (buffer: Buffer) => {
                this._inputParser.feed(buffer);
            };

            this.stdin.on('data', this._onDataHandler);
        });
    }

    protected cleanup() {
        if (this._onDataHandler) {
            this.stdin.removeListener('data', this._onDataHandler);
        }
        if (this._onKeyHandler) {
            this._inputParser.removeListener('keypress', this._onKeyHandler);
        }
        
        this.print(ANSI.DISABLE_MOUSE);

        if (typeof this.stdin.setRawMode === 'function') {
            this.stdin.setRawMode(false);
        }
        this.stdin.pause();
        this.print(ANSI.SHOW_CURSOR);
    }

    protected submit(result: T) {
        this.cleanup();
        this.print('\n'); 
        if (this._resolve) this._resolve(result);
    }

    protected cancel(reason: any) {
        this.cleanup();
        this.print('\n');
        if (this._reject) this._reject(reason);
    }

    /**
     * Renders the frame using a linear scan diffing algorithm.
     * Prevents flicker and handles height changes (expand/collapse) robustly.
     */
    protected renderFrame(content: string) {
        const width = this.stdout.columns || 80;
        const rawLines = content.split('\n');
        
        // Truncate lines to prevent wrapping artifacts
        const newLines = rawLines.map(line => this.truncate(line, width));
        
        // 1. First Render Case
        if (this.lastRenderLines.length === 0) {
            this.print(newLines.join('\n'));
            this.lastRenderLines = newLines;
            this.lastRenderHeight = newLines.length;
            return;
        }

        let outputBuffer = '';
        
        // 2. Return Cursor to the Top of the Prompt
        if (this.lastRenderHeight > 1) {
            outputBuffer += `\x1b[${this.lastRenderHeight - 1}A`;
        }
        outputBuffer += '\r'; // Ensure column 0

        // 3. Linear Scan & Update
        for (let i = 0; i < newLines.length; i++) {
            const newLine = newLines[i];
            
            // Logic for moving to the next line
            if (i > 0) {
                if (i < this.lastRenderLines.length) {
                    // Moving within the previously existing area.
                    // Use 'Down' (B) to avoid scrolling/shifting existing content.
                    outputBuffer += '\x1b[B\r';
                } else {
                    // Moving into NEW area (Append).
                    // Must use '\n' to create the new line.
                    outputBuffer += '\n';
                }
            }

            // Printing logic
            if (i < this.lastRenderLines.length) {
                const oldLine = this.lastRenderLines[i];
                if (newLine !== oldLine) {
                    // Overwrite existing line
                    outputBuffer += ANSI.ERASE_LINE + newLine;
                }
            } else {
                // Print new line (we are already at start due to '\n' above)
                outputBuffer += newLine;
            }
        }

        // 4. Handle Shrinkage (Clear garbage below)
        if (newLines.length < this.lastRenderLines.length) {
            // Move down to the first obsolete line
            outputBuffer += '\n'; 
            // Clear everything below
            outputBuffer += ANSI.ERASE_DOWN;
            // Move back up to the last valid line to maintain cursor state consistency
            outputBuffer += `\x1b[A`;
        }

        this.print(outputBuffer);

        // Update State
        this.lastRenderLines = newLines;
        this.lastRenderHeight = newLines.length;
    }

    protected stripAnsi(str: string): string {
         return stripAnsi(str);
    }

    protected truncate(str: string, width: number): string {
        const visualWidth = stringWidth(str);
        if (visualWidth <= width) {
            return str;
        }

        let currentWidth = 0;
        let cutIndex = 0;
        let inAnsi = false;
        
        for (let i = 0; i < str.length; i++) {
            if (str[i] === '\x1b') inAnsi = true;
            
            if (!inAnsi) {
                const code = str.charCodeAt(i);
                const charWidth = code > 255 ? 2 : 1; 
                if (currentWidth + charWidth > width - 3) {
                     break;
                }
                currentWidth += charWidth;
            } else {
                if (str[i] === 'm' || (str[i] >= 'A' && str[i] <= 'Z')) inAnsi = false;
            }
            cutIndex = i + 1;
        }

        return str.substring(0, cutIndex) + '...' + ANSI.RESET;
    }

    protected isUp(char: string): boolean {
        return char === '\u001b[A' || char === '\u001bOA';
    }
    protected isDown(char: string): boolean {
        return char === '\u001b[B' || char === '\u001bOB';
    }
    protected isRight(char: string): boolean {
        return char === '\u001b[C' || char === '\u001bOC';
    }
    protected isLeft(char: string): boolean {
        return char === '\u001b[D' || char === '\u001bOD';
    }
}