import { ANSI } from './ansi';
import { InputParser } from './input';
import { BaseOptions, MouseEvent } from './types';
import { detectCapabilities, stringWidth, stripAnsi } from './utils';

/**
 * Abstract base class for all prompts.
 * Now a little better.
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

    // Zero-Flicker State Tracking
    protected lastRenderLines: string[] = [];
    protected lastRenderHeight: number = 0;
    
    // Capabilities
    protected capabilities: ReturnType<typeof detectCapabilities>;

    constructor(options: O) {
        this.options = options;
        this.stdin = process.stdin;
        this.stdout = process.stdout;
        this._inputParser = new InputParser();
        this.capabilities = detectCapabilities();
    }

    /**
     * Renders the UI. Must be implemented by subclasses.
     * @param firstRender Indicates if this is the initial render.
     */
    protected abstract render(firstRender: boolean): void;

    /**
     * Handles specific key inputs. Must be implemented by subclasses.
     * @param char The string representation of the key.
     * @param key The raw buffer.
     */
    protected abstract handleInput(char: string, key: Buffer): void;

    /**
     * Optional method to handle mouse events.
     */
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
                    // Move to end to avoid overwriting content on exit
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
        // Move cursor to the end of the last rendered frame to ensure
        // subsequent logs don't overwrite the prompt
        const height = this.lastRenderLines.length;
        if (height > 0) {
             // We are currently at the "input" position inside the prompt.
             // Best safe bet is to move down to the bottom of the prompt.
             // This logic assumes the cursor ends at the last line, 
             // but let's just print a newline to be safe and simple.
             this.print('\n'); 
        } else {
             this.print('\n');
        }
        
        if (this._resolve) this._resolve(result);
    }

    // --- Zero-Flicker Rendering Engine ---

    /**
     * Renders the frame using smart diffing.
     * Instead of clearing the screen, it compares new lines with old lines
     * and only updates what changed.
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

        // 2. Diffing Logic
        // We accumulate all ANSI commands into a single buffer for atomic write
        let outputBuffer = '';
        
        // Cursor starts at the bottom of the *previous* frame (because of the join('\n') previously)
        // effectively at the end of the last line.
        // We need to track a "Virtual Cursor Y" relative to the top of the prompt (Row 0).
        // Initially, the cursor is at Row (lastHeight - 1).
        let currentCursorY = this.lastRenderHeight - 1; 

        const iterations = Math.max(this.lastRenderLines.length, newLines.length);

        for (let i = 0; i < iterations; i++) {
            const oldLine = this.lastRenderLines[i];
            const newLine = newLines[i];

            // If line changed or is new
            if (oldLine !== newLine) {
                // Move cursor to line i
                const diff = i - currentCursorY;
                if (diff < 0) outputBuffer += `\x1b[${-diff}A`; // Up
                else if (diff > 0) outputBuffer += `\x1b[${diff}B`; // Down
                
                currentCursorY = i;

                if (newLine !== undefined) {
                    // Overwrite line
                    // \r returns to start of line, ERASE_LINE clears it, then print new content
                    outputBuffer += '\r' + ANSI.ERASE_LINE + newLine;
                } else {
                    // New frame is shorter, this line needs to be removed
                    // But we handle bulk removal efficiently below, 
                    // usually simply erasing line is enough here if mixed.
                    outputBuffer += '\r' + ANSI.ERASE_LINE;
                }
            }
        }

        // 3. Handle Shrinkage (Clean up bottom garbage if new frame is shorter)
        if (newLines.length < this.lastRenderLines.length) {
            // Move to the first "dead" line
            const diff = newLines.length - currentCursorY;
            if (diff < 0) outputBuffer += `\x1b[${-diff}A`;
            else if (diff > 0) outputBuffer += `\x1b[${diff}B`;
            
            outputBuffer += ANSI.ERASE_DOWN;
            currentCursorY = newLines.length; 
        }

        // 4. Reset Cursor Position
        // To maintain state consistency for inputs that might rely on cursor position,
        // typically we leave the cursor at the end of the content.
        const finalY = newLines.length - 1;
        const moveToEnd = finalY - currentCursorY;
        
        if (moveToEnd < 0) outputBuffer += `\x1b[${-moveToEnd}A`;
        else if (moveToEnd > 0) outputBuffer += `\x1b[${moveToEnd}B`;
        
        // Ensure we are at the visual end of the last line
        // (Just to be safe for next input typing)
        // outputBuffer += '\r' + `\x1b[${stringWidth(newLines[finalY] || '')}C`;
        // Actually, simple return to start of line is often safer for Prompt logic 
        // which calculates cursor manually via handleInput -> render loop.
        
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

        // Simple heuristic truncation to fit terminal
        // This prevents the terminal from auto-wrapping text which breaks the cursor math
        let currentWidth = 0;
        let cutIndex = 0;
        
        // We strip ANSI to calculate split point, but we need to preserve ANSI codes in output.
        // For simplicity in this base implementation, we do a "hard" truncate ignoring ANSI safety 
        // if string is extremely long. 
        // A better implementation would parse ANSI. 
        // Assuming strict compliance with src/utils logic:
        
        let inAnsi = false;
        for (let i = 0; i < str.length; i++) {
            if (str[i] === '\x1b') inAnsi = true;
            
            if (!inAnsi) {
                // Check char width (simplified)
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