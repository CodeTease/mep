import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { symbols } from '../symbols';
import { FileOptions } from '../types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Implementation of FilePrompt with autocomplete.
 */
export class FilePrompt extends Prompt<string, FileOptions> {
    private input: string = '';
    private cursor: number = 0;
    private suggestions: string[] = [];
    private selectedSuggestion: number = -1;
    private errorMsg: string = '';
    private lastLinesUp: number = 0;

    constructor(options: FileOptions) {
        super(options);
        this.input = options.basePath || '';
        this.cursor = this.input.length;
        this.updateSuggestions();
    }

    /**
     * Updates the suggestions list based on the current input path.
     */
    private updateSuggestions() {
        try {
            // Determine the directory to scan and the partial file name
            const isDirQuery = this.input.endsWith('/') || this.input.endsWith('\\');
            const dir = isDirQuery ? this.input : (path.dirname(this.input) || '.');
            const partial = isDirQuery ? '' : path.basename(this.input);

            if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
                const files = fs.readdirSync(dir);
                this.suggestions = files
                    .filter(f => f.toLowerCase().startsWith(partial.toLowerCase()))
                    .filter(f => {
                        const fullPath = path.join(dir, f);
                        try {
                            const stats = fs.statSync(fullPath);
                            const isDir = stats.isDirectory();
                            if (this.options.onlyDirectories && !isDir) return false;
                            if (this.options.extensions && !isDir) {
                                return this.options.extensions.some(ext => f.endsWith(ext));
                            }
                            return true;
                        } catch (_e) {
                            return false;
                        }
                    })
                    .map(f => {
                        const fullPath = path.join(dir, f);
                        try {
                            // Append separator if the file is a directory
                            if (fs.statSync(fullPath).isDirectory()) return f + path.sep;
                        } catch (_e) { /* ignore */ }
                        return f;
                    });
            } else {
                this.suggestions = [];
            }
        } catch (_e) {
            this.suggestions = [];
        }
        this.selectedSuggestion = -1;
    }

    protected render(firstRender: boolean) {
        // Restore cursor position to the bottom before renderFrame clears the area
        if (!firstRender && this.lastLinesUp > 0) {
            this.print(`\x1b[${this.lastLinesUp}B`);
            this.lastLinesUp = 0;
        }

        const icon = this.errorMsg ? `${theme.error}${symbols.cross}` : `${theme.success}?`;
        let output = `${icon} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET} ${this.input}`;

        if (this.suggestions.length > 0) {
            output += '\n';
            const maxShow = 5;
            const displayed = this.suggestions.slice(0, maxShow);

            displayed.forEach((s, i) => {
                if (i > 0) output += '\n';
                if (i === this.selectedSuggestion) {
                    output += `${theme.main}${symbols.pointer} ${s}${ANSI.RESET}`;
                } else {
                    output += `  ${s}`;
                }
            });
            if (this.suggestions.length > maxShow) {
                output += `\n  ${theme.muted}...and ${this.suggestions.length - maxShow} more${ANSI.RESET}`;
            }
        }

        this.renderFrame(output);

        // Move cursor back up to the input line
        const totalLines = this.lastRenderHeight;
        if (totalLines > 1) {
            this.lastLinesUp = totalLines - 1;
            this.print(`\x1b[${this.lastLinesUp}A`);
        }

        // Calculate horizontal cursor position on the input line
        const prefix = `${icon} ${theme.title}${this.options.message} `;
        const prefixLen = this.stripAnsi(prefix).length;
        const targetCol = prefixLen + this.input.length;

        this.print(ANSI.CURSOR_LEFT);
        if (targetCol > 0) this.print(`\x1b[${targetCol}C`);
        this.print(ANSI.SHOW_CURSOR);
    }

    protected cleanup() {
        if (this.lastLinesUp > 0) {
            this.print(`\x1b[${this.lastLinesUp}B`);
            this.lastLinesUp = 0;
        }
        super.cleanup();
    }

    protected handleInput(char: string) {
        if (char === '\t') {
            if (this.suggestions.length > 0) {
                // Use the selected suggestion or the first one available
                const idx = this.selectedSuggestion === -1 ? 0 : this.selectedSuggestion;
                const suggestion = this.suggestions[idx];

                const isDir = this.input.endsWith('/') || this.input.endsWith('\\');
                const dir = isDir ? this.input : path.dirname(this.input);

                // Construct the new path accurately
                const baseDir = (dir === '.' && !this.input.startsWith('.')) ? '' : dir;
                this.input = path.join(baseDir, suggestion);
                this.cursor = this.input.length;

                // Immediately refresh suggestions for the new path
                this.updateSuggestions();
                this.render(false);
            }
            return;
        }

        if (char === '\r' || char === '\n') {
            this.submit(this.input);
            return;
        }

        if (this.isDown(char)) {
            if (this.suggestions.length > 0) {
                const count = Math.min(this.suggestions.length, 5);
                this.selectedSuggestion = (this.selectedSuggestion + 1) % count;
                this.render(false);
            }
            return;
        }

        if (this.isUp(char)) {
            if (this.suggestions.length > 0) {
                const count = Math.min(this.suggestions.length, 5);
                this.selectedSuggestion = (this.selectedSuggestion - 1 + count) % count;
                this.render(false);
            }
            return;
        }

        if (char === '\u0008' || char === '\x7f') {
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