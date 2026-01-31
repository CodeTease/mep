import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { symbols } from '../symbols';
import { TextOptions } from '../types';
import { safeSplit, stringWidth } from '../utils';

// --- Implementation: Text Prompt ---
export class TextPrompt<O extends TextOptions = TextOptions> extends Prompt<string, O> {
    protected errorMsg: string = '';
    // cursor is now an index into the grapheme segments array
    protected cursor: number = 0;
    protected hasTyped: boolean = false;
    protected segments: string[] = [];
    protected lastLinesUp: number = 0;
    private ghost: string = '';

    constructor(options: O) {
        super(options);
        this.value = options.initial || '';
        // Initialize segments from value
        this.segments = safeSplit(this.value);
        this.cursor = this.segments.length;
    }

    private triggerSuggest() {
        if (!this.options.suggest || this.cursor !== this.segments.length) {
            this.ghost = '';
            return;
        }

        const currentValue = this.segments.join('');
        const result = this.options.suggest(currentValue);

        if (result instanceof Promise) {
            result.then(suggestion => {
                // Check if value is still the same (avoid race condition)
                if (this.segments.join('') === currentValue) {
                    if (suggestion.startsWith(currentValue) && suggestion.length > currentValue.length) {
                         this.ghost = suggestion.slice(currentValue.length);
                    } else {
                         this.ghost = '';
                    }
                    this.render(false);
                }
            });
        } else {
            if (result.startsWith(currentValue) && result.length > currentValue.length) {
                this.ghost = result.slice(currentValue.length);
            } else {
                this.ghost = '';
            }
            // render will be called by the caller of triggerSuggest usually, but here we might need to ensure it
        }
    }

    protected render(firstRender: boolean) {
        if (!firstRender && this.lastLinesUp > 0) {
            this.print(`\x1b[${this.lastLinesUp}B`);
        }
        this.lastLinesUp = 0;

        // Calculate available width
        // 1. Prepare Prompt Label
        const icon = this.errorMsg ? `${theme.error}${symbols.cross}` : `${theme.success}?`;
        const hint = this.options.multiline ? ` ${theme.muted}(Press Ctrl+D to submit)${ANSI.RESET}` : '';
        const prefix = `${icon} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET}${hint} `;
        
        // We need visual length of prefix to calculate available space for input on the first line
        const prefixVisualLen = this.stripAnsi(prefix).length;

        // 2. Prepare Value Display
        let displayValueLines: string[] = [];
        let cursorRelativeRow = 0;
        let cursorRelativeCol = 0; // Visual column index

        // Reconstruct value from segments for logic that needs raw string
        this.value = this.segments.join('');

        if (this.segments.length === 0 && this.options.placeholder && !this.errorMsg && !this.hasTyped) {
            // Placeholder case
            const placeholder = `${theme.muted}${this.options.placeholder}${ANSI.RESET}`;
            displayValueLines = [placeholder];
            cursorRelativeRow = 0;
            cursorRelativeCol = 0;
        } else {
            const maskChar = this.options.mask ?? (this.options.isPassword ? '*' : undefined);
            // Note: password masking replaces each grapheme with '*'
            
            // Split by lines (for multiline support)
            
            // Determine which line the cursor is on
            // We need to map 'cursor' (segments index) to line/col.
            // This is tricky because segments might contain '\n'.
            // safeSplit treats '\n' as a segment.
            
            let cursorLineIndex = 0;
            
            // Let's iterate segments to find cursor position (row, col)
            cursorLineIndex = 0;
            // If we want visual cursor position, we need visual width of segments.
            let visualColIndex = 0;

            for (let i = 0; i < this.cursor; i++) {
                const seg = this.segments[i];
                if (seg === '\n') {
                    cursorLineIndex++;
                    visualColIndex = 0;
                } else {
                    if (maskChar !== undefined) {
                        visualColIndex += maskChar.length;
                    } else {
                        visualColIndex += this.getSegmentWidth(seg);
                    }
                }
            }
            
            cursorRelativeRow = cursorLineIndex;
            cursorRelativeCol = visualColIndex;

            // Now prepare lines for display (scrolling/truncation)
            // We need to reconstruct lines from segments to apply styling/truncation logic per line.
            
            let currentLineSegments: string[] = [];
            const processedLines: string[][] = []; // Array of segment arrays
            
            for (const seg of this.segments) {
                if (seg === '\n') {
                    processedLines.push(currentLineSegments);
                    currentLineSegments = [];
                } else {
                    currentLineSegments.push(seg);
                }
            }
            processedLines.push(currentLineSegments); // Last line
            
            processedLines.forEach((lineSegs: string[]) => {
                
                // Reconstruct line string for display calculation
                // If password, join with *?
                let visibleLine = '';
                if (maskChar !== undefined) {
                    visibleLine = maskChar.repeat(lineSegs.length);
                } else {
                    visibleLine = lineSegs.join('');
                }
                
                displayValueLines.push(theme.main + visibleLine + ANSI.RESET);
            });

            // Append ghost text if applicable
            if (this.ghost && this.cursor === this.segments.length && displayValueLines.length > 0) {
                displayValueLines[displayValueLines.length - 1] += theme.muted + this.ghost + ANSI.RESET;
            }
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

        // 5. Move Cursor
        const errorOffset = this.errorMsg ? 1 : 0;
        const totalRows = displayValueLines.length + errorOffset;
        
        const linesUp = (totalRows - 1) - cursorRelativeRow;
        if (linesUp > 0) {
            this.print(`\x1b[${linesUp}A`);
        }
        this.lastLinesUp = linesUp;
        
        let targetCol = 0;
        if (cursorRelativeRow === 0) {
             targetCol = prefixVisualLen + cursorRelativeCol;
        } else {
             targetCol = cursorRelativeCol;
        }
        
        this.print(ANSI.CURSOR_LEFT); 
        if (targetCol > 0) {
            this.print(`\x1b[${targetCol}C`);
        }
    }
    
    // Helper to get width of a segment
    private getSegmentWidth(seg: string): number {
        return stringWidth(seg);
    }

    protected handleInput(char: string) {
        // Tab (Accept Suggestion)
        if (char === '\t') {
            if (this.ghost) {
                const ghostSegments = safeSplit(this.ghost);
                this.segments.splice(this.cursor, 0, ...ghostSegments);
                this.cursor += ghostSegments.length;
                this.ghost = '';
                this.errorMsg = '';
                this.triggerSuggest(); // Maybe fetch next suggestion?
                this.render(false);
            }
            return;
        }

        // Enter
        if (char === '\r' || char === '\n') {
            if (this.options.multiline) {
                // Insert newline segment
                this.segments.splice(this.cursor, 0, '\n');
                this.cursor++;
                this.render(false);
                return;
            }

            this.validateAndSubmit();
            return;
        }
        
        // Ctrl+D / Ctrl+S
        if (this.options.multiline && (char === '\u0004' || char === '\u0013')) {
            this.validateAndSubmit();
            return;
        }

        // Backspace
        if (char === '\u0008' || char === '\x7f') { 
            this.hasTyped = true;
            if (this.cursor > 0) {
                // Remove segment at cursor - 1
                this.segments.splice(this.cursor - 1, 1);
                this.cursor--;
                this.errorMsg = '';
                this.triggerSuggest();
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
            if (this.cursor < this.segments.length) {
                this.cursor++;
                this.render(false);
            }
            return;
        }

        // Delete key
        if (char === '\u001b[3~') {
             this.hasTyped = true;
             if (this.cursor < this.segments.length) {
                 this.segments.splice(this.cursor, 1);
                 this.errorMsg = '';
                 this.triggerSuggest();
                 this.render(false);
             }
             return;
        }

        // Regular Typing & Paste
        // safeSplit the input char(s) - could be pasted text
        if (!/^[\x00-\x1F]/.test(char) && !char.startsWith('\x1b')) {
            this.hasTyped = true;
            const newSegments = safeSplit(char);
            this.segments.splice(this.cursor, 0, ...newSegments);
            this.cursor += newSegments.length;
            this.errorMsg = '';
            this.triggerSuggest();
            this.render(false);
        }
    }

    private validateAndSubmit() {
        this.value = this.segments.join('');
        if (this.options.validate) {
            const result = this.options.validate(this.value);
            
            if (result instanceof Promise) {
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
                        this.render(false); 
                        this.submit(this.value);
                     }
                }).catch(err => {
                     this.errorMsg = err.message || 'Validation failed';
                     this.render(false);
                });
                return;
            }

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
