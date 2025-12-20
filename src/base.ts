import { ANSI } from './ansi';
import { InputParser } from './input';
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
    protected renderFrame(content: string) {
        // Ensure lines are truncated to terminal width
        const width = this.stdout.columns || 80;
        const rawLines = content.split('\n');
        
        // Truncate each line and prepare the new buffer
        const newLines = rawLines.map(line => this.truncate(line, width));

        // Cursor logic:
        // We assume the cursor is currently at the END of the last rendered frame.
        // But to diff, it's easier to always reset to the top of the frame first.
        
        // 1. Move Cursor to Top of the Frame
        if (this.lastRenderHeight > 0) {
            this.print(`\x1b[${this.lastRenderHeight}A`); // Move up N lines
            // Actually, if last height was 1 (just one line), we move up 1 line?
            // "A\n" -> 2 lines. Cursor at bottom.
            // If we move up, we are at top.
            
            // Wait, if lastRenderHeight includes the "current line" which is usually empty if we printed with newlines?
            // Let's stick to: we printed N lines. Cursor is at line N+1 (start).
            // To go to line 1, we move up N lines.
             this.print(`\x1b[${this.lastRenderHeight}A`);
        }
        this.print(ANSI.CURSOR_LEFT);

        // 2. Diff and Render
        // We iterate through newLines.
        // For each line, check if it matches lastRenderLines[i].
        
        for (let i = 0; i < newLines.length; i++) {
            const newLine = newLines[i];
            const oldLine = this.lastRenderLines[i];

            if (newLine !== oldLine) {
                // Move to this line if not already there?
                // We are writing sequentially, so after writing line i-1 (or skipping it),
                // the cursor might not be at the start of line i if we skipped.
                
                // Strategy:
                // If we skipped lines, we need to jump down.
                // But simpler: just move cursor to line i relative to top.
                // \x1b[<N>B moves down N lines.
                // But we are processing sequentially.
                
                // If we are at line 0 (Top).
                // Process line 0. 
                // If changed, write it + \n (or clear line + write).
                // If unchanged, move cursor down 1 line.
                
                // Wait, if we use \n at end of write, cursor moves down.
                // If we skip writing, we must manually move down.
                
                this.print(ANSI.ERASE_LINE); // Clear current line
                this.print(newLine);
            }
            
            // Prepare for next line
            if (i < newLines.length - 1) {
                // If we wrote something, we are at end of line (maybe wrapped?).
                // Since we truncate, we are not wrapped.
                // But we didn't print \n yet if we just printed newLine.
                // To move to next line start:
                this.print('\n'); 
            }
        }

        // 3. Clear remaining lines if new output is shorter
        if (newLines.length < this.lastRenderLines.length) {
             // We are at the last line of new output.
             // BUG FIX: If the last line was unchanged, we skipped printing.
             // The cursor is currently at the START of that line (or end of previous).
             // We need to ensure we move to the NEXT line (or end of current) before clearing down.
             
             // If we just finished loop `i = newLines.length - 1`, we are theoretically at the end of the content.
             // However, since we might have skipped the last line, we need to be careful.
             
             // Let's force move to the end of the visual content we just defined.
             // Actually, simplest way: Just move cursor to start of line N (where N = newLines.length).
             // Currently we are at line newLines.length - 1.
             // We need to move down 1 line?
             
             // If newLines has 1 line. Loop runs 0.
             // If skipped, we are at start of line 0.
             // We need to be at line 1 to clear from there down.
             // But we didn't print \n.
             
             // So: move cursor to (newLines.length) relative to top.
             // We started at Top.
             // We iterated newLines.
             // We injected \n between lines.
             // The cursor is implicitly tracking where we are.
             // IF we skipped, we are physically at start of line `i`.
             // We need to move over it.
             
             // Fix: After the loop, explicitly move to the line AFTER the last line.
             // Since we know where we started (Top), we can just jump to line `newLines.length`.
             // But we are in relative movement land.
             
             // Let's calculate where we *should* be: End of content.
             // If we just rendered N lines, we want to be at line N+1 (conceptually) to clear below?
             // Or just at the start of line N+1?
             
             // If we have 2 lines. 
             // Line 0. \n. Line 1.
             // Cursor is at end of Line 1.
             // If we skipped Line 1, cursor is at start of Line 1.
             // We want to clear everything BELOW Line 1.
             // So we should be at start of Line 2.
             
             // Logic:
             // 1. We are currently at the cursor position after processing `newLines`.
             //    If last line was skipped, we are at start of last line.
             //    If last line was written, we are at end of last line.
             // 2. We want to erase from the line *following* the last valid line.
             
             // We can just calculate the difference and move down if needed.
             // But simpler: Move cursor to the conceptual "end" of the new frame.
             // If we processed `newLines.length` lines.
             // We want to be at row `newLines.length` (0-indexed) to start clearing?
             // No, rows are 0 to N-1.
             // We want to clear starting from row N.
             
             // Since we can't easily query cursor pos, let's use the fact we reset to Top.
             // We can move to row N relative to current? 
             // Wait, `ERASE_DOWN` clears from cursor to end of screen.
             // If we are at start of Line 1 (and it's valid), `ERASE_DOWN` deletes Line 1!
             // So we MUST be past Line 1.
             
             // If we skipped the last line, we must strictly move past it.
             // How? `\x1b[1B` (Down).
             
             // But we don't track if we skipped the last line explicitly outside the loop.
             // Let's just track `currentLineIndex`.
             
             // Alternate robust approach:
             // After loop, we forcefully move cursor to `newLines.length` lines down from Top.
             // We are currently at some unknown state (Start or End of last line).
             // BUT we can just move UP to Top again and then move DOWN N lines.
             // That feels safe.
             
             // Reset to top of frame (which we are already inside/near).
             // But we don't know exactly where we are relative to top anymore.
             
             // Let's rely on the loop index.
             // If loop finished, `i` was `newLines.length`.
             // If `newLines.length > 0`.
             // If we skipped the last line (index `len-1`), we are at start of it.
             // If we wrote it, we are at end of it.
             
             // If we skipped, we need `\x1b[1B`.
             // If we wrote, we are at end. `ERASE_DOWN` from end of line clears rest of line + below.
             // BUT we want to clear BELOW.
             // `ERASE_DOWN` (J=0) clears from cursor to end of screen.
             // If at end of line, it clears rest of that line (nothing) and lines below. Correct.
             
             // So the issue is ONLY when we skipped the last line.
             const lastLineIdx = newLines.length - 1;
             if (lastLineIdx >= 0 && newLines[lastLineIdx] === this.lastRenderLines[lastLineIdx]) {
                 // We skipped the last line. Move down 1 line to ensure we don't delete it.
                 // Also move to start (CR) to be safe?
                 this.print('\n'); 
                 // Wait, \n moves down AND to start usually. 
                 // But strictly \n is Line Feed (Down). \r is Carriage Return (Left).
                 // Console usually treats \n as \r\n in cooked mode, but in raw mode?
                 // We are in raw mode.
                 // We likely need \r\n or explicit movement.
                 // Let's just use \x1b[1B (Down) and \r (Left).
                 // Actually, if we use `\n` in loop, we rely on it working.
                 // Let's assume `\x1b[1B` is safer for "just move down".
                 // But wait, if we are at start of line, `1B` puts us at start of next line.
                 // `ERASE_DOWN` there is perfect.
                 this.print('\x1b[1B'); 
                 this.print('\r'); // Move to start
             } else {
                 // We wrote the last line. We are at the end of it.
                 // `ERASE_DOWN` will clear lines below.
                 // BUT if we want to clear the REST of the screen cleanly starting from next line...
                 // It's mostly fine.
                 
                 // However, there is a subtle case: 
                 // If we wrote the line, we are at the end of it.
                 // If we call ERASE_DOWN, it keeps current line intact (from cursor onwards, which is empty).
                 // And clears below.
                 // This is correct.
                 
                 // EXCEPT: If the old screen had MORE lines, we want to clear them.
                 // If we are at end of Line N-1.
                 // Line N exists in old screen.
                 // ERASE_DOWN clears Line N etc.
                 // Correct.
             }

             this.print(ANSI.ERASE_DOWN);
        }

        // Update state
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
        
        // We need to iterate by Code Point or Grapheme to be safe?
        // Let's use simple char iteration for speed, but respect ANSI.
        // Actually, reusing the logic from stringWidth might be best but 
        // we need the index.
        
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
                 // Width check
                 // Handle surrogates roughly (we don't need perfect width here during loop, just enough to stop)
                 // But wait, we imported `stringWidth`.
                 // We can't easily use `stringWidth` incrementally without re-parsing.
                 // Let's just trust the loop for cut index.
                 
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
                
                // Check range (simplified or call helper)
                // We don't have isWideCodePoint exported. 
                // But generally, we can just say:
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
