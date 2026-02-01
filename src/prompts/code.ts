import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { CodeOptions, MouseEvent } from '../types';
import { highlightJson } from '../highlight';

interface Token {
    type: 'static' | 'variable';
    value: string;
}

export class CodePrompt extends Prompt<string, CodeOptions> {
    private tokens: Token[] = [];
    private variableTokens: number[] = [];
    private values: Record<string, string> = {};
    private activeVarIndex: number = 0;
    private cursor: number = 0;
    private lastLinesUp: number = 0;

    constructor(options: CodeOptions) {
        super(options);
        this.parseTemplate();
        // Init values
        this.variableTokens.forEach(idx => {
            const name = this.tokens[idx].value;
            this.values[name] = (this.options.values && this.options.values[name]) || '';
        });
        
        // Init cursor at end of first var
        if (this.variableTokens.length > 0) {
             const activeName = this.tokens[this.variableTokens[0]].value;
             this.cursor = this.values[activeName].length;
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
        // Reset cursor from previous render relative position
        if (!firstRender && this.lastLinesUp > 0) {
            this.print(`\x1b[${this.lastLinesUp}B`);
        }
        this.lastLinesUp = 0;

        // 1. Construct Raw String for Highlighting
        const ACTIVE_PLACEHOLDER = '___ACTIVE___';
        let rawWithPlaceholder = '';
        
        this.tokens.forEach((token, idx) => {
            if (token.type === 'static') {
                rawWithPlaceholder += token.value;
            } else {
                if (this.variableTokens[this.activeVarIndex] === idx) {
                    rawWithPlaceholder += ACTIVE_PLACEHOLDER;
                } else {
                    rawWithPlaceholder += this.values[token.value] || '';
                }
            }
        });

        // 2. Highlight
        let highlighted = '';
        let warningMsg = '';
        const shouldHighlight = this.options.highlight !== false; 

        if (shouldHighlight) {
            warningMsg = `${ANSI.FG_YELLOW}Warning:${ANSI.RESET} Syntax highlighting is an experimental feature.\n`;
            highlighted = highlightJson(rawWithPlaceholder);
        } else {
            highlighted = rawWithPlaceholder;
        }

        // 3. Replace Placeholder with Styled Active Value
        const activeVarName = this.tokens[this.variableTokens[this.activeVarIndex]].value;
        const activeVal = this.values[activeVarName] || '';
        // Use Main color + Underline. RESET restores default.
        const styledActive = `${theme.main}${ANSI.UNDERLINE}${activeVal}${ANSI.RESET}`;
        highlighted = highlighted.replace(ACTIVE_PLACEHOLDER, styledActive);

        // 4. Output
        const prefix = `${warningMsg}${theme.success}? ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET}\n`;
        const suffix = `\n${theme.muted}(Tab to next, Enter to submit)${ANSI.RESET}`;
        const fullOutput = prefix + highlighted + suffix;

        this.renderFrame(fullOutput);

        // 5. Cursor Calculation
        // Calculate (row, col) relative to start of snippet
        let textBeforeCursor = '';
        for (let i = 0; i < this.tokens.length; i++) {
            const token = this.tokens[i];
            if (token.type === 'static') {
                textBeforeCursor += token.value;
            } else {
                if (this.variableTokens[this.activeVarIndex] === i) {
                    textBeforeCursor += activeVal.substring(0, this.cursor);
                    break;
                } else {
                    textBeforeCursor += this.values[token.value] || '';
                }
            }
        }
        
        const rowsBefore = textBeforeCursor.split('\n');
        const cursorRow = rowsBefore.length - 1; 
        const cursorCol = rowsBefore[rowsBefore.length - 1].length;

        // Calculate total lines in snippet
        let fullRaw = '';
        this.tokens.forEach(token => {
            fullRaw += (token.type === 'static' ? token.value : (this.values[token.value] || ''));
        });
        const totalSnippetLines = fullRaw.split('\n').length;
        
        // Calculate linesUp from the bottom of snippet
        // Suffix is 1 line.
        // CursorRow is 0-based index from top of snippet.
        // If cursorRow is at bottom (totalSnippetLines-1), linesUp = 1 (Suffix).
        // If cursorRow is at top (0), linesUp = 1 + (totalSnippetLines - 1).
        
        const linesUp = 1 + (totalSnippetLines - 1 - cursorRow);
        
        this.print(ANSI.SHOW_CURSOR);
        if (linesUp > 0) {
            this.print(`\x1b[${linesUp}A`);
            this.lastLinesUp = linesUp;
        }
        
        this.print(ANSI.CURSOR_LEFT);
        if (cursorCol > 0) {
            this.print(`\x1b[${cursorCol}C`);
        }
    }

    protected handleInput(char: string, _key: Buffer) {
        // Nav
        if (char === '\u001b[Z') { // Shift Tab
             this.moveFocus(-1);
             return;
        }

        if (char === '\t') {
            this.moveFocus(1);
            return;
        }
        
        // Enter
        if (char === '\r' || char === '\n') {
             this.submitCode();
             return;
        }

        const activeTokenIdx = this.variableTokens[this.activeVarIndex];
        const varName = this.tokens[activeTokenIdx].value;
        const val = this.values[varName] || '';

        // Editing
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

    protected handleMouse(event: MouseEvent) {
        if (event.action === 'scroll') {
            if (event.scroll === 'up') {
                this.moveFocus(-1);
            } else if (event.scroll === 'down') {
                this.moveFocus(1);
            }
        }
    }

    private moveFocus(direction: number) {
        const nextIndex = this.activeVarIndex + direction;
        if (nextIndex >= 0 && nextIndex < this.variableTokens.length) {
            this.activeVarIndex = nextIndex;
            const varName = this.tokens[this.variableTokens[this.activeVarIndex]].value;
            this.cursor = (this.values[varName] || '').length; // Move cursor to end
            this.render(false);
        }
    }

    private submitCode() {
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
