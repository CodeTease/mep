import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { symbols } from '../symbols';
import { SnippetOptions } from '../types';

interface Token {
    type: 'static' | 'variable';
    value: string; // For static: text. For variable: name.
}

export class SnippetPrompt extends Prompt<string, SnippetOptions> {
    private tokens: Token[] = [];
    private variableTokens: number[] = []; // Indices in this.tokens
    private values: Record<string, string> = {};
    private activeVarIndex: number = 0; // Index in variableTokens
    private cursor: number = 0; // Cursor in active variable value
    private errorMsg: string = '';

    constructor(options: SnippetOptions) {
        super(options);
        this.parseTemplate();
        
        // Initialize values
        if (options.values) {
            this.values = { ...options.values };
        }
        // Ensure all vars have entries
        this.variableTokens.forEach(idx => {
            const varName = this.tokens[idx].value;
            if (this.values[varName] === undefined) {
                this.values[varName] = '';
            }
        });
        
        if (this.variableTokens.length > 0) {
            const firstVar = this.tokens[this.variableTokens[0]].value;
            this.cursor = this.values[firstVar].length;
        }
    }

    private parseTemplate() {
        const regex = /\$\{([a-zA-Z0-9_]+)\}/g;
        let lastIndex = 0;
        let match;
        
        while ((match = regex.exec(this.options.template)) !== null) {
            if (match.index > lastIndex) {
                this.tokens.push({ type: 'static', value: this.options.template.substring(lastIndex, match.index) });
            }
            this.tokens.push({ type: 'variable', value: match[1] });
            this.variableTokens.push(this.tokens.length - 1);
            lastIndex = regex.lastIndex;
        }
        
        if (lastIndex < this.options.template.length) {
             this.tokens.push({ type: 'static', value: this.options.template.substring(lastIndex) });
        }
    }

    protected render(firstRender: boolean) {
        // Build the string
        let output = '';
        let cursorVisualIndex = 0;
        let currentVisualIndex = 0;
        
        // Prefix/Message
        const prefix = `${theme.success}? ${ANSI.BOLD}${theme.title}${this.options.message || 'Fill snippet'}${ANSI.RESET}\n`;
        output += prefix;
        // cursorVisualIndex should start after prefix?
        // Actually renderFrame handles newlines.
        // We will construct the snippet line.
        
        let snippetLine = '';
        
        this.tokens.forEach((token, index) => {
             if (token.type === 'static') {
                 snippetLine += `${theme.muted}${token.value}${ANSI.RESET}`;
                 currentVisualIndex += token.value.length; // assuming simple ascii/static length
             } else {
                 const isFocused = this.variableTokens[this.activeVarIndex] === index;
                 const val = this.values[token.value] || '';
                 // Placeholder if empty?
                 const displayVal = val.length === 0 && isFocused ? '' : val; // maybe show placeholder?
                 
                 let styledVal = displayVal;
                 if (isFocused) {
                     styledVal = `${ANSI.UNDERLINE}${theme.main}${displayVal}${ANSI.RESET}`;
                     // Calculate cursor position
                     cursorVisualIndex = currentVisualIndex + this.cursor; 
                 } else {
                     styledVal = `${theme.main}${displayVal}${ANSI.RESET}`;
                 }
                 
                 snippetLine += styledVal;
                 currentVisualIndex += displayVal.length;
             }
        });

        output += snippetLine;
        
        if (this.errorMsg) {
            output += `\n${theme.error}>> ${this.errorMsg}${ANSI.RESET}`;
        }
        
        output += `\n${theme.muted}(Tab to next variable, Enter to submit)${ANSI.RESET}`;

        this.renderFrame(output);
        
        // Position Cursor
        this.print(ANSI.SHOW_CURSOR);
        
        // We need to move to correct line and column
        // Lines:
        // 1. Message
        // 2. Snippet (cursor here)
        // 3. Error (optional)
        // 4. Hint
        
        const totalRows = this.lastRenderHeight; // or calculate from output
        // snippetLine is at index 1 (0-based) if Message has no newlines.
        // Prefix ends with \n. So snippetLine is on 2nd line.
        
        // Calculate which row relative to bottom the snippet line is.
        // If error: 4 lines total. Snippet is line 1 (2nd). Lines up = 2.
        // If no error: 3 lines total. Snippet is line 1. Lines up = 1.
        
        let linesUp = 1;
        if (this.errorMsg) linesUp++;
        
        if (linesUp > 0) {
             this.print(`\x1b[${linesUp}A`);
        }
        
        this.print(ANSI.CURSOR_LEFT);
        if (cursorVisualIndex > 0) {
            this.print(`\x1b[${cursorVisualIndex}C`);
        }
    }

    protected handleInput(char: string, key: Buffer) {
        // Navigation: Tab / Shift+Tab
        if (char === '\u001b[Z') {
             // Shift Tab -> Prev
             this.moveFocus(-1);
             return;
        }

        if (char === '\t') {
            this.moveFocus(1);
            return;
        }
        
        // Enter
        if (char === '\r' || char === '\n') {
             this.submitSnippet();
             return;
        }

        // Editing
        const activeTokenIdx = this.variableTokens[this.activeVarIndex];
        const varName = this.tokens[activeTokenIdx].value;
        const val = this.values[varName];

        if (char === '\u0008' || char === '\x7f') { // Backspace
            if (this.cursor > 0) {
                const pre = val.slice(0, this.cursor - 1);
                const post = val.slice(this.cursor);
                this.values[varName] = pre + post;
                this.cursor--;
                this.render(false);
            }
            return;
        }
        
        if (this.isLeft(char)) {
             if (this.cursor > 0) this.cursor--;
             this.render(false);
             return;
        }
        if (this.isRight(char)) {
             if (this.cursor < val.length) this.cursor++;
             this.render(false);
             return;
        }

        if (!/^[\x00-\x1F]/.test(char) && !char.startsWith('\x1b')) {
            const pre = val.slice(0, this.cursor);
            const post = val.slice(this.cursor);
            this.values[varName] = pre + char + post;
            this.cursor += char.length;
            this.render(false);
        }
    }

    private moveFocus(direction: number) {
        const nextIndex = this.activeVarIndex + direction;
        if (nextIndex >= 0 && nextIndex < this.variableTokens.length) {
            this.activeVarIndex = nextIndex;
            const varName = this.tokens[this.variableTokens[this.activeVarIndex]].value;
            this.cursor = this.values[varName].length;
            this.render(false);
        }
    }

    private submitSnippet() {
        // Construct final string
        let result = '';
        this.tokens.forEach(token => {
            if (token.type === 'static') {
                result += token.value;
            } else {
                result += this.values[token.value] || '';
            }
        });
        this.submit(result);
    }
}
