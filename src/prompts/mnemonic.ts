import { Prompt } from '../base';
import { MnemonicOptions, MouseEvent } from '../types';
import { ANSI } from '../ansi';
import { theme } from '../theme';
import { validateMnemonic, isWordValid, DEFAULT_WORDLIST } from '../bip39';
import { fuzzyMatch } from '../utils';

export class MnemonicPrompt extends Prompt<string, MnemonicOptions> {
    private words: string[];
    private cursorIndex: number = 0;
    private suggestions: string[] = [];
    private suggestionIndex: number = 0;
    private wordlist: readonly string[];
    private errorMsg: string = '';
    private length: number;

    constructor(options: MnemonicOptions) {
        super(options);
        // Use the provided wordlist or fallback to the imported DEFAULT_WORDLIST (English)
        this.wordlist = options.wordlist || DEFAULT_WORDLIST;
        this.length = options.length || 12;
        this.words = new Array(this.length).fill('');
    }

    protected render(_firstRender: boolean) {
        let output = `${theme.title}${this.options.message}${ANSI.RESET}\n`;
        
        const filledCount = this.words.filter(w => w.length > 0).length;
        output += `${theme.muted}Word ${filledCount}/${this.length}${ANSI.RESET}\n`;

        const colWidth = 18; 
        const cols = 4;
        
        let grid = '';
        for (let i = 0; i < this.length; i++) {
            const isCursor = i === this.cursorIndex;
            const word = this.words[i];
            const num = (i + 1).toString().padStart(2, ' ');
            
            let wordColor = ANSI.RESET;
            const isValid = isWordValid(word, this.wordlist);
            
            if (word.length > 0) {
                wordColor = isValid ? ANSI.FG_GREEN : ANSI.FG_RED;
            } else {
                wordColor = theme.muted;
            }

            let displayWord = word;
            // Mask input if showInput is explicitly false (default usually true for mnemonic entry?)
            // Actually, standard practice for mnemonics is often masked, but user can toggle.
            // Following existing logic here.
            if (this.options.showInput === false && word.length > 0) {
                displayWord = '*'.repeat(word.length);
            } else if (word.length === 0) {
                displayWord = '-';
            }

            let cellPrefix = `${ANSI.FG_BLUE}${num}.${ANSI.RESET} `;
            let cellContent = '';

            if (isCursor) {
                cellContent = `${ANSI.REVERSE}${displayWord || ' '}${ANSI.RESET}`;
            } else {
                cellContent = `${wordColor}${displayWord}${ANSI.RESET}`;
            }
            
            grid += cellPrefix + cellContent;
            
            if ((i + 1) % cols === 0) {
                grid += '\n';
            } else {
                // Calculate padding for alignment
                const contentLen = (word.length === 0 && !isCursor) ? 1 : Math.max(1, displayWord.length);
                const currentLen = 4 + contentLen; // 4 is prefix length " 1. "
                const padding = Math.max(2, colWidth - currentLen);
                grid += ' '.repeat(padding);
            }
        }
        output += '\n' + grid;

        if (this.suggestions.length > 0) {
            output += `\n${theme.muted}Suggestions: ${ANSI.RESET}`;
            const view = this.suggestions.slice(0, 7);
            const suggestionStr = view.map((s, idx) => {
                 const isSelected = idx === this.suggestionIndex;
                 if (isSelected) {
                     return `${ANSI.BG_BLUE}${ANSI.FG_WHITE} ${s} ${ANSI.RESET}`;
                 }
                 return `${ANSI.FG_CYAN} ${s} ${ANSI.RESET}`;
            }).join(' ');
            output += suggestionStr;
            if (this.suggestions.length > 7) {
                output += ` ${theme.muted}...${ANSI.RESET}`;
            }
        } else {
            // Empty line to maintain stability
            output += `\n`; 
        }

        if (this.errorMsg) {
            output += `\n${theme.error}${this.errorMsg}${ANSI.RESET}`;
        }
        
        this.renderFrame(output);
    }

    protected handleInput(char: string) {
        // Navigation: Arrow Left
        if (this.isLeft(char)) {
            this.cursorIndex = (this.cursorIndex - 1 + this.length) % this.length;
            this.updateSuggestions();
            this.errorMsg = '';
            this.render(false);
            return;
        }
        
        // Navigation: Arrow Right
        if (this.isRight(char)) {
            this.cursorIndex = (this.cursorIndex + 1) % this.length;
            this.updateSuggestions();
            this.errorMsg = '';
            this.render(false);
            return;
        }

        // Tab: Autocomplete
        if (char === '\t') {
            if (this.suggestions.length > 0) {
                this.words[this.cursorIndex] = this.suggestions[this.suggestionIndex];
                // Move to next word automatically after autocomplete
                this.cursorIndex = Math.min(this.length - 1, this.cursorIndex + 1);
                this.updateSuggestions();
            }
            this.render(false);
            return;
        }

        // Shift+Tab: Move back
        if (char === '\u001b[Z') {
            this.cursorIndex = Math.max(0, this.cursorIndex - 1);
            this.updateSuggestions();
            this.render(false);
            return;
        }

        // Suggestion Navigation (Up/Down)
        if (this.isDown(char) || this.isUp(char)) {
             if (this.suggestions.length > 0) {
                 const dir = this.isUp(char) ? -1 : 1;
                 this.suggestionIndex = (this.suggestionIndex + dir + this.suggestions.length) % this.suggestions.length;
                 this.render(false);
             }
             return;
        }

        // Backspace
        if (char === '\u0008' || char === '\x7f') {
            const currentWord = this.words[this.cursorIndex];
            if (currentWord.length > 0) {
                this.words[this.cursorIndex] = currentWord.slice(0, -1);
                this.updateSuggestions();
            } else {
                // If current word is empty, move back to previous word
                if (this.cursorIndex > 0) {
                    this.cursorIndex--;
                    this.updateSuggestions();
                }
            }
            this.errorMsg = '';
            this.render(false);
            return;
        }

        // Space or Enter
        if (char === ' ' || char === '\r' || char === '\n') {
            const currentWord = this.words[this.cursorIndex];
            
            // Check submit condition (Enter key)
            if ((char === '\r' || char === '\n')) {
                // Validate completeness and checksum
                if (this.isAllValid()) {
                    if (validateMnemonic(this.words, this.wordlist)) {
                        this.submit(this.words.join(' '));
                        return;
                    } else {
                        this.errorMsg = 'Invalid Checksum!';
                        this.render(false);
                        return;
                    }
                }
            }

            // Apply suggestion if needed (on Space/Enter if word is incomplete but matches a suggestion)
            if (this.suggestions.length > 0 && currentWord !== this.suggestions[this.suggestionIndex]) {
                 // Only autocomplete if the current typed word isn't already valid on its own
                 // (Prevents annoying jumps if the user typed a valid short word that is also a prefix of another)
                 if (!isWordValid(currentWord, this.wordlist)) {
                     this.words[this.cursorIndex] = this.suggestions[this.suggestionIndex];
                 }
            }

            // Move to next word
            if (this.cursorIndex < this.length - 1) {
                this.cursorIndex++;
                this.updateSuggestions();
                this.errorMsg = '';
            }
            
            this.render(false);
            return;
        }

        // Typing / Paste Handling
        if (!/^[\x00-\x1F]/.test(char) && !char.startsWith('\x1b')) {
            // Check for paste (multiple characters or separators)
            // Enhanced split regex to handle standard spaces, newlines, tabs, AND Ideographic Space (\u3000) for Japanese
            if (char.length > 1 || /[\s\u3000]/.test(char)) {
                 const parts = char.split(/[\s\n\t\u3000]+/);
                 let idx = this.cursorIndex;
                 
                 for (let i = 0; i < parts.length; i++) {
                     const part = parts[i];
                     if (!part) continue; // Skip empty splits
                     
                     if (idx >= this.length) break;

                     if (i === 0) {
                         // Append to current word (continuation of typing/paste at cursor)
                         this.words[idx] += part;
                     } else {
                         // Move to next slot
                         idx++;
                         if (idx < this.length) {
                             this.words[idx] = part;
                         }
                     }
                 }
                 this.cursorIndex = Math.min(this.length - 1, idx);
            } else {
                // Single character typing
                this.words[this.cursorIndex] += char;
            }
            
            this.updateSuggestions();
            this.errorMsg = '';
            this.render(false);
        }
    }

    protected handleMouse(event: MouseEvent) {
        if (event.action === 'scroll' && this.suggestions.length > 0) {
            if (event.scroll === 'up') {
                this.suggestionIndex = Math.max(0, this.suggestionIndex - 1);
            } else {
                this.suggestionIndex = Math.min(this.suggestions.length - 1, this.suggestionIndex + 1);
            }
            this.render(false);
        }
    }

    private updateSuggestions() {
        this.suggestionIndex = 0;
        const currentWord = this.words[this.cursorIndex];
        
        if (currentWord.length === 0) {
            this.suggestions = [];
            return;
        }
        
        // Filter by fuzzy match from the current wordlist
        const matches = [];
        for (const w of this.wordlist) {
            const res = fuzzyMatch(currentWord, w);
            if (res && res.score > 0) {
                matches.push({ word: w, score: res.score });
            }
        }
        
        // Sort by score
        matches.sort((a, b) => b.score - a.score);
        this.suggestions = matches.slice(0, 10).map(m => m.word);
    }

    private isAllValid(): boolean {
        // Ensure all slots are filled and valid against the wordlist
        return this.words.every(w => w.length > 0 && isWordValid(w, this.wordlist));
    }
}