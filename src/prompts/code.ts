import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { CodeOptions, MouseEvent } from '../types';
import { stringWidth } from '../utils';
import { highlight } from '../highlight';

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

    // FIX: Override cleanup to ensure cursor is reset to bottom
    protected cleanup() {
        // If the cursor is currently moved up (editing mode), move it back down
        // before the prompt exits. This prevents the next output (or result)
        // from overwriting the bottom part of our UI.
        if (this.lastLinesUp > 0) {
            this.print(`\x1b[${this.lastLinesUp}B`);
            this.lastLinesUp = 0;
        }
        super.cleanup();
    }

    protected render(firstRender: boolean) {
        if (!firstRender && this.lastLinesUp > 0) {
            this.print(`\x1b[${this.lastLinesUp}B`);
        }
        this.lastLinesUp = 0;

        // 1. Build Full Raw Text & Identify Active Variable Range
        let fullRawText = '';
        let activeVarStart = -1;
        let activeVarEnd = -1;
        
        const activeTokenIdx = this.variableTokens[this.activeVarIndex];
        // const activeVarName = this.tokens[activeTokenIdx].value;
        
        this.tokens.forEach((token, idx) => {
            const val = (token.type === 'static') ? token.value : (this.values[token.value] || '');
            
            if (idx === activeTokenIdx) {
                activeVarStart = fullRawText.length;
                activeVarEnd = activeVarStart + val.length;
            }
            
            fullRawText += val;
        });

        // 2. Syntax Highlight with Overlap Logic
        let highlighted = '';
        const shouldHighlight = this.options.highlight !== false;

        if (shouldHighlight) {
            const lang = this.options.language || 'json';
            const highlightedText = highlight(fullRawText, lang);
            
            let visibleIdx = 0;
            let activeColor = ''; // Tracks the last set color
            
            for (let i = 0; i < highlightedText.length; i++) {
                const char = highlightedText[i];
                
                if (char === '\x1b') {
                    // Start of ANSI sequence
                    let sequence = char;
                    i++;
                    while (i < highlightedText.length && highlightedText[i] !== 'm') {
                        sequence += highlightedText[i];
                        i++;
                    }
                    if (i < highlightedText.length) sequence += 'm'; // Append terminator
                    
                    // Interpret sequence (naive)
                    if (sequence === ANSI.RESET || sequence === '\x1b[0m') {
                        activeColor = ''; 
                    } else {
                        // Assuming it's a color code.
                        activeColor = sequence;
                    }
                    
                    // If we are INSIDE the active range, and we encounter a color change/reset,
                    // we must ensure UNDERLINE is kept/restored.
                    if (visibleIdx >= activeVarStart && visibleIdx < activeVarEnd) {
                         // Output the sequence (e.g. a color change)
                         highlighted += sequence;
                         // Then re-assert underline
                         highlighted += ANSI.UNDERLINE;
                    } else {
                        highlighted += sequence;
                    }
                    continue;
                }
                
                // Normal char
                if (visibleIdx === activeVarStart) {
                    highlighted += `${theme.main}${ANSI.UNDERLINE}`;
                }
                
                highlighted += char;
                visibleIdx++;
                
                if (visibleIdx === activeVarEnd) {
                    highlighted += ANSI.RESET;
                    // Restore previous color if any
                    if (activeColor) {
                        highlighted += activeColor;
                    }
                }
            }
             highlighted += ANSI.RESET;
        } else {
             this.appendSegment(fullRawText, 0, activeVarStart, activeVarEnd, ANSI.RESET, (s) => highlighted += s);
        }


        // 3. Output Frame
        const warningMsg = shouldHighlight 
            ? `${ANSI.FG_YELLOW}Warning:${ANSI.RESET} Syntax highlighting is an experimental feature.\n` 
            : '';
            
        const prefix = `${warningMsg}${theme.success}? ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET}\n`;
        const suffix = `\n${theme.muted}(Tab to next, Enter to submit)${ANSI.RESET}`;
        const fullOutput = prefix + highlighted + suffix;

        this.renderFrame(fullOutput);

        // 4. Cursor Calculation
        const cursorAbsPos = activeVarStart + this.cursor;
        const textBeforeCursor = fullRawText.substring(0, cursorAbsPos);
        
        const rowsBefore = textBeforeCursor.split('\n');
        const cursorRow = rowsBefore.length - 1; 
        const cursorCol = stringWidth(rowsBefore[rowsBefore.length - 1]);

        const totalSnippetLines = fullRawText.split('\n').length;
        // linesUp calculation: 1 (suffix) + remaining snippet lines
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

    private appendSegment(
        text: string, 
        absStart: number, 
        activeStart: number, 
        activeEnd: number, 
        syntaxColor: string, 
        append: (s: string) => void
    ) {
        const absEnd = absStart + text.length;
        const overlapStart = Math.max(absStart, activeStart);
        const overlapEnd = Math.min(absEnd, activeEnd);

        if (overlapStart < overlapEnd) {
            if (absStart < overlapStart) {
                const part = text.substring(0, overlapStart - absStart);
                append(`${syntaxColor}${part}${ANSI.RESET}`);
            }
            const activePart = text.substring(overlapStart - absStart, overlapEnd - absStart);
            append(`${theme.main}${ANSI.UNDERLINE}${activePart}${ANSI.RESET}`);
            
            if (absEnd > overlapEnd) {
                const part = text.substring(overlapEnd - absStart);
                append(`${syntaxColor}${part}${ANSI.RESET}`);
            }
        } else {
            append(`${syntaxColor}${text}${ANSI.RESET}`);
        }
    }

    protected handleInput(char: string, _key: Buffer) {
        if (char === '\u001b[Z') { 
             this.moveFocus(-1); return;
        }
        if (char === '\t') {
            this.moveFocus(1); return;
        }
        if (char === '\r' || char === '\n') {
             this.submitCode(); return;
        }

        const activeTokenIdx = this.variableTokens[this.activeVarIndex];
        const varName = this.tokens[activeTokenIdx].value;
        const val = this.values[varName] || '';

        if (char === '\u0008' || char === '\x7f') { 
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
            if (event.scroll === 'up') this.moveFocus(-1);
            else if (event.scroll === 'down') this.moveFocus(1);
        }
    }

    private moveFocus(direction: number) {
        const nextIndex = this.activeVarIndex + direction;
        if (nextIndex >= 0 && nextIndex < this.variableTokens.length) {
            this.activeVarIndex = nextIndex;
            const varName = this.tokens[this.variableTokens[this.activeVarIndex]].value;
            this.cursor = (this.values[varName] || '').length; 
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
