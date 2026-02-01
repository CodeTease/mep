import { Prompt } from '../base';
import { RegexOptions } from '../types';
import { ANSI } from '../ansi';
import { theme } from '../theme';
import { symbols } from '../symbols';
import { safeSplit } from '../utils';

export class RegexPrompt extends Prompt<RegExp, RegexOptions> {
    private input: string = '';
    private cursor: number = 0;
    private segments: string[] = [];
    private error: string = '';
    private regex: RegExp | null = null;
    
    constructor(options: RegexOptions) {
        super(options);
        this.input = '';
        this.segments = [];
        this.validateRegex();
    }

    private validateRegex() {
        try {
            if (this.input.length === 0) {
                this.regex = null;
                this.error = 'Regex is empty';
                return;
            }
            this.regex = new RegExp(this.input, this.options.flags);
            this.error = '';
        } catch (e: any) {
            this.regex = null;
            this.error = e.message.replace(/^Invalid regular expression: \/.*?\/: /, '');
        }
    }

    protected render(firstRender: boolean) {
        // Line 1: Header + Input
        const icon = this.error ? `${theme.error}${symbols.cross}` : `${theme.success}?`;
        const prefix = `${icon} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET} `;
        
        let displayInput = '';
        // Reconstruct input with cursor handling
        // Simple rendering for now, mimicking text prompt logic simplified
        const beforeCursor = this.segments.slice(0, this.cursor).join('');
        const afterCursor = this.segments.slice(this.cursor).join('');
        
        displayInput = theme.main + beforeCursor + ANSI.UNDERLINE + (afterCursor[0] || ' ') + ANSI.RESET + '\x1b[24m' + theme.main + afterCursor.slice(1);
        
        if (this.segments.length === 0) {
            displayInput = theme.muted + '(Type regex pattern)' + ANSI.RESET;
             // If empty, show cursor on the start of placeholder
             displayInput = ANSI.UNDERLINE + displayInput[0] + ANSI.RESET + '\x1b[24m' + theme.muted + displayInput.slice(1);
        } else if (this.cursor >= this.segments.length) {
            // Cursor at end
            displayInput = theme.main + this.segments.join('') + ANSI.UNDERLINE + ' ' + ANSI.RESET + '\x1b[24m';
        }

        let output = `${prefix}${displayInput}`;

        // Line 2: Error (if any)
        if (this.error && this.input.length > 0) {
            output += `\n${theme.error}>> Invalid Regex: ${this.error}${ANSI.RESET}`;
        }

        // Line 3+: Test Cases
        output += `\n\n${ANSI.BOLD}Test Cases:${ANSI.RESET}`;
        
        this.options.tests.forEach(testCase => {
            let isMatch = false;
            if (this.regex) {
                isMatch = this.regex.test(testCase);
            }
            
            const statusIcon = isMatch ? `${theme.success}${symbols.tick}` : `${theme.error}${symbols.cross}`;
            // Highlight the match if possible? simpler to just show status for now
            // Maybe color the text green/red based on match
            const color = isMatch ? theme.success : theme.muted;
            output += `\n ${statusIcon} ${color}${testCase}${ANSI.RESET}`;
        });

        this.renderFrame(output);
    }

    protected handleInput(char: string, key: Buffer) {
        // Enter
        if (char === '\r' || char === '\n') {
            if (this.regex && !this.error) {
                this.submit(this.regex);
            }
            return;
        }

        // Backspace
        if (char === '\u0008' || char === '\x7f') {
            if (this.cursor > 0) {
                this.segments.splice(this.cursor - 1, 1);
                this.cursor--;
                this.input = this.segments.join('');
                this.validateRegex();
                this.render(false);
            }
            return;
        }

        // Left Arrow
        if (this.isLeft(char)) {
            if (this.cursor > 0) {
                this.cursor--;
                this.render(false);
            }
            return;
        }

        // Right Arrow
        if (this.isRight(char)) {
            if (this.cursor < this.segments.length) {
                this.cursor++;
                this.render(false);
            }
            return;
        }

        // Delete
        if (char === '\u001b[3~') {
            if (this.cursor < this.segments.length) {
                this.segments.splice(this.cursor, 1);
                this.input = this.segments.join('');
                this.validateRegex();
                this.render(false);
            }
            return;
        }

        // Regular Typing
        if (!/^[\x00-\x1F]/.test(char) && !char.startsWith('\x1b')) {
            const newSegments = safeSplit(char);
            this.segments.splice(this.cursor, 0, ...newSegments);
            this.cursor += newSegments.length;
            this.input = this.segments.join('');
            this.validateRegex();
            this.render(false);
        }
    }
}
