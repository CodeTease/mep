import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { symbols } from '../symbols';
import { TextOptions } from '../types';
import { safeSplit, stringWidth } from '../utils';

// --- Implementation: Text Prompt ---
export class TextPrompt extends Prompt<string, TextOptions> {
    private errorMsg: string = '';
    // cursor is now an index into the grapheme segments array
    private cursor: number = 0;
    private hasTyped: boolean = false;
    private segments: string[] = [];

    constructor(options: TextOptions) {
        super(options);
        this.value = options.initial || '';
        // Initialize segments from value
        this.segments = safeSplit(this.value);
        this.cursor = this.segments.length;
    }

    protected render(firstRender: boolean) {
        // Calculate available width
        const cols = process.stdout.columns || 80;
        
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
            const rawValue = maskChar !== undefined ? maskChar.repeat(this.segments.length) : this.value;
            // Note: password masking replaces each grapheme with '*'
            
            // Split by lines (for multiline support)
            const lines = rawValue.split('\n');
            
            // Determine which line the cursor is on
            // We need to map 'cursor' (segments index) to line/col.
            // This is tricky because segments might contain '\n'.
            // safeSplit treats '\n' as a segment.
            
            let cursorLineIndex = 0;
            const cursorSegmentIndexOnLine = 0;
            const currentSegmentIndex = 0;
            
            for (let i = 0; i < lines.length; i++) {
                const lineSegmentsCount = 0;
            }
            
            // Let's iterate segments to find cursor position (row, col)
            cursorLineIndex = 0;
            const colIndex = 0; // Visual column or char index?
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
            
            processedLines.forEach((lineSegs: string[], idx: number) => {
                const isCursorLine = idx === cursorLineIndex;
                const linePrefixLen = (idx === 0) ? prefixVisualLen : 0; 
                const maxContentLen = Math.max(10, cols - linePrefixLen - 1);
                
                // Reconstruct line string for display calculation
                // If password, join with *?
                let visibleLine = '';
                if (maskChar !== undefined) {
                    visibleLine = maskChar.repeat(lineSegs.length);
                } else {
                    visibleLine = lineSegs.join('');
                }
                
                if (isCursorLine) {
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

        // 5. Move Cursor
        const errorOffset = this.errorMsg ? 1 : 0;
        const totalRows = displayValueLines.length + errorOffset;
        
        const linesUp = (totalRows - 1) - cursorRelativeRow;
        if (linesUp > 0) {
            this.print(`\x1b[${linesUp}A`);
        }
        
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
