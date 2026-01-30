import { ANSI } from './ansi';
import { InputParser } from './input';
import { BaseOptions, MouseEvent } from './types';
import { detectCapabilities, stringWidth, stripAnsi } from './utils';

/**
 * Abstract base class for all prompts.
 * Handles common logic like stdin management, raw mode, and cleanup
 * to enforce DRY (Don't Repeat Yourself) principles.
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

    // Smart Cursor State
    protected lastRenderHeight: number = 0;
    protected lastRenderLines: string[] = [];

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
     * Subclasses can override this to implement mouse interaction.
     */
    protected handleMouse(_event: MouseEvent): void {}

    protected print(text: string) {
        this.stdout.write(text);
    }

    /**
     * Starts the prompt interaction.
     * Sets up raw mode and listeners, returning a Promise.
     */
    public run(): Promise<T> {
        return new Promise((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;

            if (typeof this.stdin.setRawMode === 'function') {
                this.stdin.setRawMode(true);
            }
            this.stdin.resume();
            this.stdin.setEncoding('utf8');

            // Enable Mouse Tracking if supported and requested
            // Default to true if capabilities support it, unless explicitly disabled in options
            const shouldEnableMouse = (this.options as BaseOptions).mouse !== false && this.capabilities.hasMouse;
            if (shouldEnableMouse) {
                this.print(ANSI.SET_ANY_EVENT_MOUSE + ANSI.SET_SGR_EXT_MODE_MOUSE);
            }

            // Initial render: Default to hidden cursor (good for menus)
            // Subclasses like TextPrompt will explicitly show it if needed.
            if (this.capabilities.isCI) {
                 // In CI, maybe don't hide cursor or do nothing?
                 // But for now follow standard flow.
            }
            this.print(ANSI.HIDE_CURSOR);
            this.render(true);

            // Setup Input Parser Listeners
            this._onKeyHandler = (char: string, buffer: Buffer) => {
                // Global Exit Handler (Ctrl+C)
                if (char === '\u0003') {
                    this.cleanup();
                    this.print(ANSI.SHOW_CURSOR + '\n');
                    if (this._reject) this._reject(new Error('User force closed'));
                    return;
                }
                this.handleInput(char, buffer);
            };

            this._inputParser.on('keypress', this._onKeyHandler);
            
            // Listen to mouse events
            this._inputParser.on('mouse', (event: MouseEvent) => {
                this.handleMouse(event);
            });

            this._onDataHandler = (buffer: Buffer) => {
                this._inputParser.feed(buffer);
            };

            this.stdin.on('data', this._onDataHandler);
        });
    }

    /**
     * Cleans up listeners and restores stdin state.
     */
    protected cleanup() {
        if (this._onDataHandler) {
            this.stdin.removeListener('data', this._onDataHandler);
        }
        if (this._onKeyHandler) {
            this._inputParser.removeListener('keypress', this._onKeyHandler);
        }
        
        // Disable Mouse Tracking
        this.print(ANSI.DISABLE_MOUSE);

        if (typeof this.stdin.setRawMode === 'function') {
            this.stdin.setRawMode(false);
        }
        this.stdin.pause();
        this.print(ANSI.SHOW_CURSOR);
    }

    /**
     * Submits the final value and resolves the promise.
     */
    protected submit(result: T) {
        this.cleanup();
        this.print('\n'); 
        if (this._resolve) this._resolve(result);
    }

    // --- Rendering Utilities ---

    /**
     * Render Method with Diffing (Virtual DOM for CLI).
     * Calculates new lines, compares with old lines, and updates only changed parts.
     */
    /**
     * Renders the current frame by clearing the previous output and writing the new content.
     * This approach ("Move Up -> Erase Down -> Print") is more robust against artifacts 
     * than line-by-line diffing, especially when the number of lines changes (e.g., filtering).
     */
    protected renderFrame(content: string) {
        const width = this.stdout.columns || 80;
        const rawLines = content.split('\n');

        // Truncate each line to fit terminal width to avoid wrapping issues
        const newLines = rawLines.map(line => this.truncate(line, width));

        // 1. Move cursor to the start of the current line
        this.print(ANSI.CURSOR_LEFT);

        // 2. Move cursor up to the top of the previously rendered frame
        if (this.lastRenderHeight > 0) {
            // If the previous render had multiple lines, move up to the first line
            if (this.lastRenderHeight > 1) {
                this.print(`\x1b[${this.lastRenderHeight - 1}A`);
            }
        }

        // 3. Clear everything from the cursor down
        // This ensures all previous content (including "ghost" lines) is removed
        this.print(ANSI.ERASE_DOWN);

        // 4. Print the new frame content
        for (let i = 0; i < newLines.length; i++) {
            this.print(newLines[i]);
            // Add newline character between lines, but not after the last line
            if (i < newLines.length - 1) {
                this.print('\n');
            }
        }

        // 5. Update state for the next render cycle
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

        // Heuristic truncation using stringWidth
        // We iterate and sum width until we hit limit - 3
        let currentWidth = 0;
        let cutIndex = 0;
        
        let inAnsi = false;
        for (let i = 0; i < str.length; i++) {
            const code = str.charCodeAt(i);
             if (str[i] === '\x1b') {
                inAnsi = true;
            }
            
            if (inAnsi) {
                 if ((str[i] >= '@' && str[i] <= '~') || (str[i] >= 'a' && str[i] <= 'z') || (str[i] >= 'A' && str[i] <= 'Z')) {
                    inAnsi = false;
                }
            } else {
                 // Re-implement basic width logic here for the cut index finding
                let charWidth = 1;
                 
                let cp = code;
                if (code >= 0xD800 && code <= 0xDBFF && i + 1 < str.length) {
                    const next = str.charCodeAt(i + 1);
                    if (next >= 0xDC00 && next <= 0xDFFF) {
                        cp = (code - 0xD800) * 0x400 + (next - 0xDC00) + 0x10000;
                        // i is incremented in main loop but we need to skip next char
                        // We'll handle i increment in the loop
                    }
                }

                if (cp >= 0x1100) { // Quick check for potentially wide
                     // It's acceptable to be slightly aggressive on wide chars for truncation
                     charWidth = 2;
                }
                
                if (currentWidth + charWidth > width - 3) {
                    cutIndex = i;
                    break;
                }
                currentWidth += charWidth;
                
                if (cp > 0xFFFF) {
                     i++; // Skip low surrogate
                }
            }
            cutIndex = i + 1;
        }

        return str.substring(0, cutIndex) + '...' + ANSI.RESET;
    }

    // Helper to check for arrow keys including application mode
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
