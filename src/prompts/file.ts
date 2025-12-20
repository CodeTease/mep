import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { FileOptions } from '../types';
import * as fs from 'fs';
import * as path from 'path';

// --- Implementation: File Prompt ---
export class FilePrompt extends Prompt<string, FileOptions> {
    private input: string = '';
    private cursor: number = 0;
    private suggestions: string[] = [];
    private selectedSuggestion: number = -1;
    private errorMsg: string = '';

    constructor(options: FileOptions) {
        super(options);
        this.input = options.basePath || '';
        this.cursor = this.input.length;
    }

    private updateSuggestions() {
        try {
            const dir = path.dirname(this.input) || '.';
            const partial = path.basename(this.input);
            
            if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
                const files = fs.readdirSync(dir);
                this.suggestions = files
                    .filter(f => f.startsWith(partial))
                    .filter(f => {
                         const fullPath = path.join(dir, f);
                         // Handle errors if file doesn't exist or permission denied
                         try {
                             const isDir = fs.statSync(fullPath).isDirectory();
                             if (this.options.onlyDirectories && !isDir) return false;
                             if (this.options.extensions && !isDir) {
                                 return this.options.extensions.some(ext => f.endsWith(ext));
                             }
                             return true;
                         } catch (e) {
                             return false;
                         }
                    })
                    .map(f => {
                        const fullPath = path.join(dir, f);
                        try {
                            if (fs.statSync(fullPath).isDirectory()) return f + '/';
                        } catch (e) { /* ignore */ }
                        return f;
                    });
            } else {
                this.suggestions = [];
            }
        } catch (e) {
            this.suggestions = [];
        }
        this.selectedSuggestion = -1;
    }

    protected render(firstRender: boolean) {
        // Construct string
        const icon = this.errorMsg ? `${theme.error}✖` : `${theme.success}?`;
        let output = `${icon} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET} ${this.input}`;

        // Suggestions
        if (this.suggestions.length > 0) {
            output += '\n'; // Separate input from suggestions
            const maxShow = 5;
            const displayed = this.suggestions.slice(0, maxShow);
            
            displayed.forEach((s, i) => {
                if (i > 0) output += '\n';
                if (i === this.selectedSuggestion) {
                     output += `${theme.main}❯ ${s}${ANSI.RESET}`;
                } else {
                     output += `  ${s}`;
                }
            });
            if (this.suggestions.length > maxShow) {
                output += `\n  ...and ${this.suggestions.length - maxShow} more`;
            }
        }
        
        this.renderFrame(output);
        this.print(ANSI.SHOW_CURSOR);

        // Restore Cursor Logic
        // We need to move up to the input line if we printed suggestions.
        // The input line is always the first line (index 0).
        // So we move up by (totalLines - 1).
        
        const totalLines = this.lastRenderHeight; // renderFrame sets this
        if (totalLines > 1) {
            this.print(`\x1b[${totalLines - 1}A`);
        }
        
        // Move right
        const prefix = `${icon} ${theme.title}${this.options.message} `;
        const prefixLen = this.stripAnsi(prefix).length;
        // Cursor is usually at the end of input unless we add backspace support etc.
        // The cursor property tracks it, but my handleInput simplified it.
        // Let's rely on this.input.length for now since handleInput appends.
        // Ah, handleInput logic below supports cursor pos theoretically but I only see appending?
        // Actually handleInput doesn't support left/right in the original code, it supports down/up for suggestions.
        // So cursor is always at end.
        
        const targetCol = prefixLen + this.input.length;
        
        this.print(ANSI.CURSOR_LEFT);
        if (targetCol > 0) this.print(`\x1b[${targetCol}C`);
    }

    protected handleInput(char: string) {
        if (char === '\t') { // Tab
            if (this.suggestions.length === 1) {
                const dir = path.dirname(this.input);
                this.input = path.join(dir === '.' ? '' : dir, this.suggestions[0]);
                this.cursor = this.input.length;
                this.suggestions = [];
                this.render(false);
            } else if (this.suggestions.length > 1) {
                // Cycle or show? For now cycle if selected
                if (this.selectedSuggestion !== -1) {
                     const dir = path.dirname(this.input);
                     this.input = path.join(dir === '.' ? '' : dir, this.suggestions[this.selectedSuggestion]);
                     this.cursor = this.input.length;
                     this.suggestions = [];
                     this.render(false);
                } else {
                     // Just show suggestions (already done in render loop usually, but update logic ensures it)
                     this.updateSuggestions();
                     this.render(false);
                }
            } else {
                this.updateSuggestions();
                this.render(false);
            }
            return;
        }

        if (char === '\r' || char === '\n') {
            if (this.selectedSuggestion !== -1) {
                 const dir = path.dirname(this.input);
                 this.input = path.join(dir === '.' ? '' : dir, this.suggestions[this.selectedSuggestion]);
                 this.cursor = this.input.length;
                 this.suggestions = [];
                 this.selectedSuggestion = -1;
                 this.render(false);
            } else {
                this.submit(this.input);
            }
            return;
        }

        if (this.isDown(char)) { // Down
            if (this.suggestions.length > 0) {
                this.selectedSuggestion = (this.selectedSuggestion + 1) % Math.min(this.suggestions.length, 5);
                this.render(false);
            }
            return;
        }
         if (this.isUp(char)) { // Up
            if (this.suggestions.length > 0) {
                this.selectedSuggestion = (this.selectedSuggestion - 1 + Math.min(this.suggestions.length, 5)) % Math.min(this.suggestions.length, 5);
                this.render(false);
            }
            return;
        }

        if (char === '\u0008' || char === '\x7f') { // Backspace
             if (this.input.length > 0) {
                 this.input = this.input.slice(0, -1);
                 this.updateSuggestions();
                 this.render(false);
             }
             return;
        }

        if (!/^[\x00-\x1F]/.test(char) && !char.startsWith('\x1b')) {
            this.input += char;
            this.updateSuggestions();
            this.render(false);
        }
    }
}
