import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { MaskedOptions } from '../types';

export class MaskedPrompt extends Prompt<string, MaskedOptions> {
    private input: string = ''; // Raw input string (without separators)
    private cursor: number = 0; // Cursor position in logical INPUT string
    private maskTokens: { char: string, isToken: boolean, type?: '9'|'a'|'*' }[] = [];
    private placeholder: string;

    constructor(options: MaskedOptions) {
        super(options);
        this.placeholder = options.placeholder || '_';
        this.parseMask();
    }

    private parseMask() {
        for (const char of this.options.mask) {
            if (['9', 'a', '*'].includes(char)) {
                this.maskTokens.push({ char, isToken: true, type: char as any });
            } else {
                this.maskTokens.push({ char, isToken: false });
            }
        }
    }

    protected render(firstRender: boolean) {
        let output = `${theme.success}? ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET}\n`;
        
        let display = '';
        let inputIndex = 0;
        
        this.maskTokens.forEach((token) => {
            if (token.isToken) {
                if (inputIndex < this.input.length) {
                    const val = this.input[inputIndex];
                    display += `${theme.main}${val}${ANSI.RESET}`;
                    inputIndex++;
                } else {
                    display += `${theme.muted}${this.placeholder}${ANSI.RESET}`;
                }
            } else {
                display += `${theme.muted}${token.char}${ANSI.RESET}`;
            }
        });
        
        output += display;

        this.renderFrame(output);
        
        // Calculate Visual Cursor Position
        let visualCursorIndex = 0;
        let tokenCount = 0;
        let found = false;
        
        for (let i = 0; i < this.maskTokens.length; i++) {
            if (this.maskTokens[i].isToken) {
                if (tokenCount === this.cursor) {
                    visualCursorIndex = i;
                    found = true;
                    break;
                }
                tokenCount++;
            }
        }
        
        if (!found) {
             // If cursor is at end of input, and input is full or partial
             // Cursor should be after the last filled token
             // But wait, if input is full, tokenCount == maskTokens.filter(isToken).length
             // And loop finishes.
             // We need to find the visual index corresponding to "after last token"
             // But that might be a fixed char or end of string.
             
             // Simple approach:
             // Iterate tokens again, count tokens. When count == cursor, stop.
             // But we need to skip fixed chars.
             
             // If !found, it means cursor == input.length (which is valid, at end).
             // We just iterate from start until we pass `cursor` tokens.
             let count = 0;
             for (let i = 0; i < this.maskTokens.length; i++) {
                 if (this.maskTokens[i].isToken) {
                     count++;
                 }
                 if (count > this.cursor) {
                     // We passed the cursor position
                     visualCursorIndex = i;
                     found = true;
                     break;
                 }
                 // If count == cursor, we are AT the token that will be filled next.
                 // So we want visualIndex of that token.
                 // My loop above does exactly that: `if (tokenCount === this.cursor)`.
                 // So why !found?
                 // `this.cursor` starts at 0. `tokenCount` starts at 0.
                 // If cursor=0. First token: tokenCount=0. Match. visual=index.
                 // If input is full (say 3 tokens). cursor can be 3 (after last).
                 // tokenCount will go 0, 1, 2. Loop ends. !found.
                 // We need to position at end.
                 visualCursorIndex = this.maskTokens.length;
             }
        }

        this.print(ANSI.SHOW_CURSOR);
        this.print(ANSI.CURSOR_LEFT);
        if (visualCursorIndex > 0) {
            this.print(`\x1b[${visualCursorIndex}C`);
        }
    }

    protected handleInput(char: string, key: Buffer) {
        // Enter
        if (char === '\r' || char === '\n') {
            this.submit(this.input);
            return;
        }

        // Backspace
        if (char === '\u0008' || char === '\x7f') { 
            if (this.cursor > 0) {
                this.input = this.input.slice(0, this.cursor - 1) + this.input.slice(this.cursor);
                this.cursor--;
                this.render(false);
            }
            return;
        }
        
        // Navigation
        if (this.isLeft(char)) {
            if (this.cursor > 0) this.cursor--;
            this.render(false);
            return;
        }
        if (this.isRight(char)) {
            if (this.cursor < this.input.length) this.cursor++;
            this.render(false);
            return;
        }
        
        // Typing
        if (!/^[\x00-\x1F]/.test(char) && !char.startsWith('\x1b')) {
             const maxLen = this.maskTokens.filter(t => t.isToken).length;
             if (this.input.length >= maxLen) return;
             
             const token = this.getTokenAtLogicalIndex(this.cursor);
             if (token && this.isValid(char, token.type)) {
                 this.input = this.input.slice(0, this.cursor) + char + this.input.slice(this.cursor);
                 this.cursor++;
                 this.render(false);
             }
        }
    }
    
    private getTokenAtLogicalIndex(index: number) {
        let count = 0;
        for (const t of this.maskTokens) {
            if (t.isToken) {
                if (count === index) return t;
                count++;
            }
        }
        return null;
    }
    
    private isValid(char: string, type?: '9'|'a'|'*'): boolean {
        if (type === '9') return /^\d$/.test(char);
        if (type === 'a') return /^[a-zA-Z]$/.test(char);
        return /^[\x20-\x7E]$/.test(char);
    }
}
