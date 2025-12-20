import { ANSI } from './ansi';

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
    private _onDataHandler?: (chunk: Buffer) => void;

    // Smart Cursor State
    protected lastRenderHeight: number = 0;

    constructor(options: O) {
        this.options = options;
        this.stdin = process.stdin;
        this.stdout = process.stdout;
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
            this.print(ANSI.HIDE_CURSOR);
            this.render(true);

            this._onDataHandler = (buffer: Buffer) => {
                const char = buffer.toString();

                // Global Exit Handler (Ctrl+C)
                if (char === '\u0003') {
                    this.cleanup();
                    this.print(ANSI.SHOW_CURSOR + '\n');
                    if (this._reject) this._reject(new Error('User force closed'));
                    return;
                }

                this.handleInput(char, buffer);
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
     * Double Buffering Render Method.
     * Takes the full content string, calculates height, moves cursor up,
     * writes content, and clears remaining lines.
     */
    protected renderFrame(content: string) {
        // 1. Move Cursor Up
        if (this.lastRenderHeight > 1) {
            this.print(`\x1b[${this.lastRenderHeight - 1}A`);
        }
        // Always move to start of line
        this.print(ANSI.CURSOR_LEFT);

        // 2. Prepare content and calculate height
        // Ensure lines are truncated to terminal width
        const width = this.stdout.columns || 80;
        const lines = content.split('\n');
        
        let finalOutput = '';
        let newHeight = 0;

        for (const line of lines) {
            const truncated = this.truncate(line, width);
            finalOutput += truncated + '\n'; // Add newline for each line
            newHeight++;
        }
        // Remove the last newline added by the loop if necessary, 
        // but typically prompt output ends with newline for clean separation?
        // Actually, typically we just join by \n.
        // Wait, if I split by \n, and join by \n, I get back the string.
        // But `truncate` might change the visual string.
        
        // Let's rebuild the string properly.
        finalOutput = lines.map(line => this.truncate(line, width)).join('\n');
        // If the original content ended with \n (which it often does implicitly or explicitly),
        // split will create an empty string at the end.
        // E.g. "A\nB\n" -> ["A", "B", ""].
        // If we map and join, we get "A\nB\n". Correct.
        // But height calculation needs to be careful.
        
        // Re-calculating height based on wrapped lines?
        // No, we are TRUNCATING, so 1 logical line = 1 physical line.
        // Unless we decide to wrap. The instructions said "Cut off" (Truncation).
        // So height = number of lines.
        
        // Wait, does split include the empty string at the end?
        // "a\n".split('\n') -> ['a', '']
        // Height should be the number of visual lines.
        // If content is "Header\nOption1\nOption2", height is 3.
        // If content is "Header\nOption1\nOption2\n", height is 4 (last line empty).
        // Usually we don't want the last empty line to count as a "line used" if it's just the cursor sitting there?
        // But if we print it, it takes space.
        
        // Let's check how prompts construct strings.
        // SelectPrompt: "Header\nItem\nItem\n"
        // This prints 3 lines of text and moves cursor to next line.
        // So strictly speaking it occupies 3 lines + 1 partial line (cursor).
        // But if we print "Header\nItem\nItem", it occupies 3 lines.
        
        // Let's assume content does NOT have a trailing newline unless intended.
        // But typical usage: output += `... \n`
        
        // If I print "A\nB\n", the cursor is on the line AFTER B.
        // That line is visually empty but it is the "current line".
        // If I move UP by height, I need to account for where the cursor ended up.
        
        // If I write "A\nB", cursor is at end of B. Height is 2.
        // Moving up 2 lines puts me at start of A (if I also carriage return).
        // \x1b[2A moves up 2 lines.
        
        // If I write "A\nB\n", cursor is on line 3 (empty).
        // To go to start of A, I need to move up 2 lines? No.
        // Line 1: A
        // Line 2: B
        // Line 3: (cursor here)
        // Up 1 -> Line 2. Up 2 -> Line 1.
        // So if there are 2 newlines, I need to go up 2 lines.
        
        newHeight = 0;
        // We count how many newlines are in the final output?
        // Or simpler: count lines in the array.
        // But be careful with trailing empty string from split.
        
        // Let's strip the last newline from content before splitting if it exists
        // to avoid counting an empty line that doesn't really have content, 
        // UNLESS we want that empty line.
        // Actually, if we use `console.log` it adds newline. `stdout.write` does not.
        
        // Let's just process lines.
        
        this.print(ANSI.CURSOR_LEFT); // Ensure we are at column 0 before writing?
        // Actually `renderFrame` assumes we are at the start of where we want to write 
        // (after moving up).
        
        this.print(finalOutput);

        // Calculate lines produced.
        // A string with N '\n' produces N+1 lines effectively? 
        // Or rather, it moves the cursor down N times.
        // "A" -> 0 newlines. Cursor on same line. Height 1? 
        // If I want to clear it, I clear 1 line.
        // If I write "A\n", cursor on next line. Height 2?
        
        // Let's define height as "number of rows occupied on screen".
        // "A" occupies 1 row.
        // "A\nB" occupies 2 rows.
        // "A\n" occupies 2 rows (one with A, one empty where cursor sits).
        
        // So height = (number of \n) + 1.
        // "A" -> split -> ["A"] -> len 1. Height 1.
        // "A\nB" -> split -> ["A", "B"] -> len 2. Height 2.
        // "A\n" -> split -> ["A", ""] -> len 2. Height 2.
        
        newHeight = finalOutput.split('\n').length;
        
        // 3. Clear remaining lines
        if (newHeight < this.lastRenderHeight) {
             const diff = this.lastRenderHeight - newHeight;
             // We are currently at the end of the new output.
             // If new output is shorter, we have 'diff' lines of garbage below us.
             this.print(ANSI.ERASE_DOWN); 
        }
        
        this.lastRenderHeight = newHeight;
    }

    protected stripAnsi(str: string): string {
         return str.replace(/\x1b\[[0-9;]*m/g, '');
    }

    protected truncate(str: string, width: number): string {
        const stripped = this.stripAnsi(str);
        if (stripped.length <= width) {
            return str;
        }

        // We need to truncate but preserve ANSI codes? 
        // That's hard. 
        // For now, simpler truncation: 
        // If we assume ANSI codes don't take space, we iterate chars and count visual length.
        
        // Simple heuristic: If string is too long, cut it.
        // But blindly cutting might cut in the middle of an ANSI code.
        // Given constraints ("No dependency"), a robust ANSI-aware truncate is complex.
        // However, most lines in CLI are: indent + icon + text.
        // Text is at the end.
        // So cutting off the end usually is fine, provided we reset color at the end.
        
        // Strategy:
        // 1. Calculate visual width.
        // 2. If > width, cut at (width - 3) and add "...".
        // 3. Append ANSI.RESET to be safe.
        
        // To do this safely without complex parsing:
        // Just slice the string? No, that counts invisible chars.
        
        // Let's implement a basic loop.
        let visualLength = 0;
        let cutIndex = 0;
        let isAnsi = false;
        
        for (let i = 0; i < str.length; i++) {
            if (str[i] === '\x1b') {
                isAnsi = true;
            }
            
            if (isAnsi) {
                // CSI sequences end with a byte between 0x40 (@) and 0x7E (~)
                if (str[i] >= '@' && str[i] <= '~') { 
                     isAnsi = false;
                }
                // Continue to next char, don't count visual
            } else {
                visualLength++;
            }
            
            if (visualLength > width - 3) {
                cutIndex = i; // This is roughly where we want to stop to leave room for ...
                // But we should verify if we are in ANSI.
                // This simple parser is flaky for complex codes like colors
                // \x1b[31m is easy.
                // But generally, if we exceed width, we just want to stop.
                break;
            }
            
            cutIndex = i + 1;
        }
        
        if (visualLength > width - 3) {
             // We stopped early.
             // We take the substring up to cutIndex.
             // But we must ensure we didn't cut inside an ANSI sequence.
             // Since we only increment visualLength when !isAnsi, 
             // and we break immediately when visualLength hits limit,
             // we might be in 'text' mode.
             
             // What if the string has tons of ANSI at the end? 
             // We might cut before them? That's fine, they wouldn't be seen/apply anyway? 
             // Except Reset.
             
             return str.substring(0, cutIndex) + '...' + ANSI.RESET;
        }
        
        return str;
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
