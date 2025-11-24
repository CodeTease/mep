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
                         const isDir = fs.statSync(fullPath).isDirectory();
                         if (this.options.onlyDirectories && !isDir) return false;
                         if (this.options.extensions && !isDir) {
                             return this.options.extensions.some(ext => f.endsWith(ext));
                         }
                         return true;
                    })
                    .map(f => {
                        const fullPath = path.join(dir, f);
                        if (fs.statSync(fullPath).isDirectory()) return f + '/';
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
        this.print(ANSI.SHOW_CURSOR);

        if (!firstRender) {
             // Clear input line + suggestions
             this.print(ANSI.ERASE_LINE + ANSI.CURSOR_LEFT); // Input line
             // We need to track how many lines suggestions took
             // For now assume simple clear, or use ANSI.ERASE_DOWN if at bottom?
             // Safer to move up and clear
             this.print(ANSI.ERASE_DOWN);
        }
        
        const icon = this.errorMsg ? `${theme.error}✖` : `${theme.success}?`;
        this.print(`${icon} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET} ${this.input}`);

        if (this.suggestions.length > 0) {
            this.print('\n');
            const maxShow = 5;
            this.suggestions.slice(0, maxShow).forEach((s, i) => {
                if (i === this.selectedSuggestion) {
                     this.print(`${theme.main}❯ ${s}${ANSI.RESET}\n`);
                } else {
                     this.print(`  ${s}\n`);
                }
            });
            if (this.suggestions.length > maxShow) {
                this.print(`  ...and ${this.suggestions.length - maxShow} more\n`);
            }
            // Move cursor back to input line
            const lines = Math.min(this.suggestions.length, maxShow) + (this.suggestions.length > maxShow ? 2 : 1);
            this.print(`\x1b[${lines}A`);
            const inputLen = this.options.message.length + 3 + this.input.length;
            this.print(`\x1b[${inputLen}C`);
        }
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
