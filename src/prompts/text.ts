import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { TextOptions } from '../types';

// --- Implementation: Text Prompt ---
export class TextPrompt extends Prompt<string, TextOptions> {
    private errorMsg: string = '';
    private cursor: number = 0;
    private hasTyped: boolean = false;
    // renderLines removed as renderFrame handles logic

    constructor(options: TextOptions) {
        super(options);
        this.value = options.initial || '';
        this.cursor = this.value.length;
    }

    protected render(firstRender: boolean) {
        // Calculate available width
        const cols = process.stdout.columns || 80;
        
        // 1. Prepare Prompt Label
        const icon = this.errorMsg ? `${theme.error}✖` : `${theme.success}?`;
        const hint = this.options.multiline ? ` ${theme.muted}(Press Ctrl+D to submit)${ANSI.RESET}` : '';
        const prefix = `${icon} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET}${hint} `;
        
        // We need visual length of prefix to calculate available space for input on the first line
        const prefixVisualLen = this.stripAnsi(prefix).length;

        // 2. Prepare Value Display
        let displayValueLines: string[] = [];
        let cursorRelativeRow = 0;
        let cursorRelativeCol = 0;

        if (!this.value && this.options.placeholder && !this.errorMsg && !this.hasTyped) {
            // Placeholder case
            const placeholder = `${theme.muted}${this.options.placeholder}${ANSI.RESET}`;
            // If placeholder is too long, we might need to truncate it too, but simpler to just show it.
            // But cursor stays at position 0 (start).
            displayValueLines = [placeholder];
            // Cursor is at 0,0 relative to value start
            cursorRelativeRow = 0;
            cursorRelativeCol = 0;
        } else {
            const rawValue = this.options.isPassword ? '*'.repeat(this.value.length) : this.value;
            
            // Split by lines (for multiline support)
            // If empty, lines = [""]
            const lines = rawValue.split('\n');
            
            // Determine which line the cursor is on
            let charCount = 0;
            let cursorLineIndex = 0;
            let cursorColIndex = this.cursor;

            for (let i = 0; i < lines.length; i++) {
                // length + 1 for newline
                if (charCount + lines[i].length >= this.cursor) {
                    cursorLineIndex = i;
                    cursorColIndex = this.cursor - charCount;
                    break;
                }
                charCount += lines[i].length + 1;
            }
            // Edge case: cursor at end of last line
            if (this.cursor === rawValue.length && lines.length > 0) {
                 cursorLineIndex = lines.length - 1;
                 cursorColIndex = lines[lines.length - 1].length;
            } else if (lines.length === 0) { // Should not happen with split('') on empty string -> ['']
                 cursorLineIndex = 0;
                 cursorColIndex = 0;
            }

            cursorRelativeRow = cursorLineIndex;
            
            // Process each line for horizontal scrolling/truncation
            lines.forEach((line: string, idx: number) => {
                const isCursorLine = idx === cursorLineIndex;
                const linePrefixLen = (idx === 0) ? prefixVisualLen : 0; 
                // Available width for this line's content
                // We reserve 1 char at end to avoid auto-wrap issues if we hit edge exactly?
                // renderFrame truncates at `cols`, so we have `cols - linePrefixLen`.
                const maxContentLen = Math.max(10, cols - linePrefixLen - 1); // -1 safety
                
                let visibleLine = line;
                
                if (isCursorLine) {
                    // Scroll logic to keep cursor visible
                    // cursorColIndex is where the cursor is *within this line*
                    
                    if (visibleLine.length > maxContentLen) {
                        // Calculate window
                        let start = 0;
                        if (cursorColIndex > maxContentLen) {
                            // Scroll so cursor is roughly at end
                            start = cursorColIndex - maxContentLen + 3; // +3 context
                        }
                        // Ensure we don't scroll past end? No, cursor can be at end.
                        
                        // We also need to cap start if line is huge but cursor is at start?
                        // No, if cursor is at start, start=0.
                        
                        // If we scroll, we prepend '...'
                        if (start > 0) {
                            visibleLine = '...' + visibleLine.slice(start);
                            // Adjust cursor position
                            // We removed `start` chars, but added 3 chars '...'
                            // So visual cursor pos = cursorColIndex - start + 3
                            cursorRelativeCol = cursorColIndex - start + 3;
                        } else {
                            // Just truncate end if too long
                            // But wait, if cursor is at end, we need to scroll.
                            // The logic above handles `cursorColIndex > maxContentLen`.
                            // If `cursorColIndex <= maxContentLen` but `line.length > maxContentLen`,
                            // we just truncate the tail.
                            // `renderFrame` would do it, but we can do it explicitly.
                            visibleLine = visibleLine.slice(0, maxContentLen);
                             cursorRelativeCol = cursorColIndex;
                        }
                    } else {
                         cursorRelativeCol = cursorColIndex;
                    }
                } else {
                    // Non-active line: simple truncate
                     if (visibleLine.length > maxContentLen) {
                         visibleLine = visibleLine.slice(0, maxContentLen - 3) + '...';
                     }
                }
                
                displayValueLines.push(theme.main + visibleLine + ANSI.RESET);
            });
        }
        
        // 3. Assemble Output
        let output = '';
        displayValueLines.forEach((lineStr, idx) => {
             if (idx === 0) {
                 output += prefix + lineStr;
             } else {
                 output += '\n' + lineStr;
             }
        });
        
        if (this.errorMsg) {
             output += `\n${theme.error}>> ${this.errorMsg}${ANSI.RESET}`;
        }
        
        // 4. Render Frame
        this.renderFrame(output);
        
        this.print(ANSI.SHOW_CURSOR);

        // 5. Move Cursor to Correct Position
        // We are currently at the bottom-left (or end of last line) after renderFrame + write.
        // Actually, renderFrame writes content.
        // If content has N lines, we are at line N.
        
        // If errorMsg exists, it's an extra line at the end.
        const errorOffset = this.errorMsg ? 1 : 0;
        const totalRows = displayValueLines.length + errorOffset;
        
        // We want to be at `cursorRelativeRow` (0-indexed from start of value)
        // Current position is after printing `totalRows`.
        // So we need to move UP by (totalRows - 1 - cursorRelativeRow).
        
        const linesUp = (totalRows - 1) - cursorRelativeRow;
        if (linesUp > 0) {
            this.print(`\x1b[${linesUp}A`);
        }
        
        // Horizontal move
        // Row 0 has prefix. Other rows start at 0?
        // Wait, line 0 is `prefix + value`.
        // Other lines are just `value` (in my construction above).
        
        let targetCol = 0;
        if (cursorRelativeRow === 0) {
             targetCol = prefixVisualLen + cursorRelativeCol;
        } else {
             targetCol = cursorRelativeCol;
        }
        
        this.print(ANSI.CURSOR_LEFT); // Go to start
        if (targetCol > 0) {
            this.print(`\x1b[${targetCol}C`);
        }
    }

    protected handleInput(char: string) {
        // Enter
        if (char === '\r' || char === '\n') {
            if (this.options.multiline) {
                this.value = this.value.slice(0, this.cursor) + '\n' + this.value.slice(this.cursor);
                this.cursor++;
                this.render(false);
                return;
            }

            this.validateAndSubmit();
            return;
        }
        
        // Ctrl+D (EOF) or Ctrl+S for Submit in Multiline
        if (this.options.multiline && (char === '\u0004' || char === '\u0013')) {
            this.validateAndSubmit();
            return;
        }

        // Backspace
        if (char === '\u0008' || char === '\x7f') { 
            this.hasTyped = true;
            if (this.cursor > 0) {
                this.value = this.value.slice(0, this.cursor - 1) + this.value.slice(this.cursor);
                this.cursor--;
                this.errorMsg = '';
                this.render(false);
            }
            return;
        }

        // Arrow Left
        if (this.isLeft(char)) {
            if (this.cursor > 0) {
                this.cursor--;
                this.render(false);
            }
            return;
        }

        // Arrow Right
        if (this.isRight(char)) {
            if (this.cursor < this.value.length) {
                this.cursor++;
                this.render(false);
            }
            return;
        }

        // Delete key
        if (char === '\u001b[3~') {
             this.hasTyped = true;
             if (this.cursor < this.value.length) {
                 this.value = this.value.slice(0, this.cursor) + this.value.slice(this.cursor + 1);
                 this.errorMsg = '';
                 this.render(false);
             }
             return;
        }

        // Regular Typing & Paste
        if (!/^[\x00-\x1F]/.test(char) && !char.startsWith('\x1b')) {
            this.hasTyped = true;
            this.value = this.value.slice(0, this.cursor) + char + this.value.slice(this.cursor);
            this.cursor += char.length;
            this.errorMsg = '';
            this.render(false);
        }
    }

    private validateAndSubmit() {
        if (this.options.validate) {
            const result = this.options.validate(this.value);
            
            // Handle Promise validation
            if (result instanceof Promise) {
                // Show loading state
                // With renderFrame, we can just render a loading state
                // But we need to keep the input visible ideally, or just a spinner?
                // The original code printed "Validating..."
                
                // Let's print a temporary message below?
                // Or just use errorMsg slot for status?
                // Using errorMsg slot is easiest with the current renderFrame setup.
                
                this.errorMsg = 'Validating...';
                this.render(false);

                result.then(valid => {
                     if (typeof valid === 'string' && valid.length > 0) {
                         this.errorMsg = valid;
                         this.render(false);
                     } else if (valid === false) {
                         this.errorMsg = 'Invalid input';
                         this.render(false);
                     } else {
                        this.errorMsg = '';
                        this.render(false); // Clear error message
                        this.submit(this.value);
                     }
                }).catch(err => {
                     this.errorMsg = err.message || 'Validation failed';
                     this.render(false);
                });
                return;
            }

            // Handle Sync validation
            if (typeof result === 'string' && result.length > 0) {
                this.errorMsg = result;
                this.render(false);
                return;
            }
            if (result === false) {
                 this.errorMsg = 'Invalid input';
                 this.render(false);
                 return;
            }
        }
        
        this.submit(this.value);
    }
}
