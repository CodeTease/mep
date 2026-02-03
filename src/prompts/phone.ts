import { Prompt } from '../base';
import { PhoneOptions } from '../types';
import { COUNTRIES, CountryEntry } from '../data/countries';
import { theme } from '../theme';
import { ANSI } from '../ansi';
import { fuzzyMatch, stripAnsi } from '../utils';

export class PhonePrompt extends Prompt<string, PhoneOptions> {
    protected activeSection: 'country' | 'number' = 'number';
    protected selectedCountryIndex: number = 0;
    protected rawNumber: string = ''; // Only digits
    protected cursor: number = 0; // Index in rawNumber
    protected searchBuffer: string = '';
    protected lastLinesUp: number = 0;
    protected errorMsg: string = '';
    
    // For country search/filtering
    protected filteredIndices: number[] = [];

    constructor(options: PhoneOptions) {
        super(options);
        
        // Initialize country
        if (options.defaultCountry) {
            const idx = COUNTRIES.findIndex(c => c[0] === options.defaultCountry?.toUpperCase());
            if (idx !== -1) this.selectedCountryIndex = idx;
        } else {
            // Default to US or VN? Let's default to index 0 (US in our list usually, or whatever is first)
            this.selectedCountryIndex = 0;
        }
        
        this.filteredIndices = COUNTRIES.map((_, i) => i);
    }

    private get currentCountry(): CountryEntry {
        return COUNTRIES[this.selectedCountryIndex];
    }

    private get mask(): string {
        return this.currentCountry[3];
    }

    private get dialCode(): string {
        return this.currentCountry[2];
    }

    /**
     * Maps a raw index (index in the digit-only string) to a visual index in the formatted string.
     */
    private getVisualIndex(rawIndex: number, mask: string): number {
        let rawCounter = 0;
        for (let i = 0; i < mask.length; i++) {
            if (rawCounter === rawIndex) {
                if (mask[i] === '#') {
                    return i;
                }
            }
            
            if (mask[i] === '#') {
                rawCounter++;
            }
        }
        // If we went past the end
        return mask.length;
    }
    
    /**
     * Maps rawIndex to visual index, handling skipping of static characters.
     */
    private getVisualPosition(rawIndex: number): number {
        const mask = this.mask;
        let v = 0;
        let r = 0;
        
        while (v < mask.length) {
            if (r === rawIndex) {
                // We reached the raw position. 
                // However, if the current mask char is NOT a placeholder, we should skip it
                // because the user doesn't type it.
                // E.g. mask "###-###". rawIndex 3.
                // v=0(#), r=0 -> next
                // v=1(#), r=1 -> next
                // v=2(#), r=2 -> next
                // v=3(-). We are at r=3. The cursor should be at v=4 (the next #).
                while (v < mask.length && mask[v] !== '#') {
                    v++;
                }
                return v;
            }
            
            if (mask[v] === '#') {
                r++;
            }
            v++;
        }
        return v;
    }

    /**
     * Formats the raw number according to the mask.
     */
    private formatNumber(): string {
        const mask = this.mask;
        let result = '';
        let rawIdx = 0;
        
        for (let i = 0; i < mask.length; i++) {
            const m = mask[i];
            if (m === '#') {
                if (rawIdx < this.rawNumber.length) {
                    result += this.rawNumber[rawIdx];
                    rawIdx++;
                } else {
                    result += m; // Placeholder
                }
            } else {
                result += m;
            }
        }
        return result;
    }
    
    /**
     * Renders the formatted number with highlighting.
     */
    private renderFormattedNumber(): string {
        const mask = this.mask;
        let output = '';
        let rawIdx = 0;
        
        for (let i = 0; i < mask.length; i++) {
            const m = mask[i];
            if (m === '#') {
                if (rawIdx < this.rawNumber.length) {
                    // Typed digit
                    output += theme.main + this.rawNumber[rawIdx] + ANSI.RESET;
                    rawIdx++;
                } else {
                    // Placeholder
                    output += theme.muted + '#' + ANSI.RESET;
                }
            } else {
                if (rawIdx > 0 || (rawIdx === 0 && this.rawNumber.length > 0)) {
                     output += theme.muted + m + ANSI.RESET;
                } else {
                     output += theme.muted + m + ANSI.RESET;
                }
            }
        }
        return output;
    }

    protected render(firstRender: boolean) {
        if (!firstRender && this.lastLinesUp > 0) {
            this.print(`\x1b[${this.lastLinesUp}B`);
        }
        
        // 1. Title/Message
        const check = this.errorMsg ? theme.error + '✖' : theme.success + '?';
        const title = `${check} ${theme.title}${this.options.message}${ANSI.RESET} `;
        
        // 2. Build Components
        const country = this.currentCountry;
        
        // Country Section: "+84 (VN)"
        // Highlight if active
        const prefixStr = `+${country[2]} (${country[0]})`;
        let prefixRender = '';
        if (this.activeSection === 'country') {
            prefixRender = ANSI.BG_BLUE + ANSI.FG_WHITE + prefixStr + ANSI.RESET;
        } else {
            prefixRender = theme.muted + prefixStr + ANSI.RESET;
        }
        
        // Input Section
        const formatted = this.renderFormattedNumber();
        const inputRender = formatted;
        
        // Layout: [Prefix] [Input]
        const line = `${prefixRender} ${inputRender}`;
        
        let output = title + line;
        
        if (this.errorMsg) {
            output += `\n${theme.error}>> ${this.errorMsg}${ANSI.RESET}`;
        } else if (this.activeSection === 'country' && this.searchBuffer) {
             output += `\n${theme.muted}Searching: "${this.searchBuffer}"...${ANSI.RESET}`;
        }
        
        this.renderFrame(output);
        
        // 3. Cursor Positioning
        const errorOffset = (this.errorMsg || (this.activeSection === 'country' && this.searchBuffer)) ? 1 : 0;
        const totalRows = 1 + errorOffset;
        
        // Reset cursor to end of render
        const linesUp = totalRows - 1;
        if (linesUp > 0) {
            this.print(`\x1b[${linesUp}A`);
        }
        this.lastLinesUp = linesUp;
        
        this.print(ANSI.CURSOR_LEFT);
        
        // Calculate horizontal position
        const titleWidth = stripAnsi(title).length;
        
        if (this.activeSection === 'country') {
            // Place cursor at end of prefix text? Or keep it hidden?
            // Let's place it at the end of the prefix.
            const prefixWidth = prefixStr.length;
            const target = titleWidth + prefixWidth;
            if (target > 0) this.print(`\x1b[${target}C`);
        } else {
            // Active is number
            // Start position = Title + Prefix + Space
            const prefixWidth = prefixStr.length;
            const startX = titleWidth + prefixWidth + 1;
            
            // Visual offset within input
            const visualOffset = this.getVisualPosition(this.cursor);
            const target = startX + visualOffset;
            
            if (target > 0) this.print(`\x1b[${target}C`);
        }
        
        this.print(ANSI.SHOW_CURSOR);
    }
    
    protected handleInput(char: string) {
        // Handle common keys
        if (char === '\r' || char === '\n') {
            this.validateAndSubmit();
            return;
        }
        
        if (char === '\t') {
            // Toggle section
            this.activeSection = this.activeSection === 'country' ? 'number' : 'country';
            this.render(false);
            return;
        }

        // Backspace
        if (char === '\x7f' || char === '\u0008') {
            if (this.activeSection === 'number') {
                if (this.cursor > 0) {
                    this.rawNumber = this.rawNumber.slice(0, this.cursor - 1) + this.rawNumber.slice(this.cursor);
                    this.cursor--;
                    this.errorMsg = '';
                    this.render(false);
                } else {
                    // If at start of number, maybe backspace into country section?
                    this.activeSection = 'country';
                    this.render(false);
                }
            } else {
                // Country section
                if (this.searchBuffer.length > 0) {
                    this.searchBuffer = this.searchBuffer.slice(0, -1);
                    this.filterCountries();
                    this.render(false);
                }
            }
            return;
        }
        
        // Arrows
        if (char === '\u001b[D') { // Left
            if (this.activeSection === 'number') {
                if (this.cursor > 0) {
                    this.cursor--;
                } else {
                    this.activeSection = 'country';
                }
            }
            this.render(false);
            return;
        }
        
        if (char === '\u001b[C') { // Right
            if (this.activeSection === 'country') {
                this.activeSection = 'number';
            } else {
                if (this.cursor < this.rawNumber.length) {
                    this.cursor++;
                }
            }
            this.render(false);
            return;
        }
        
        if (char === '\u001b[A') { // Up
            if (this.activeSection === 'country') {
                this.cycleCountry(-1);
            }
            this.render(false);
            return;
        }

        if (char === '\u001b[B') { // Down
            if (this.activeSection === 'country') {
                this.cycleCountry(1);
            }
            this.render(false);
            return;
        }
        
        // Typing
        if (!/^[\x00-\x1F]/.test(char) && !char.startsWith('\x1b')) {
            if (this.activeSection === 'country') {
                this.searchBuffer += char;
                this.filterCountries();
                this.render(false);
            } else {
                // Number input: digits only
                if (/^\d+$/.test(char)) {
                    // Check max length
                    const maxLen = this.getMaxRawLength();
                    if (this.rawNumber.length < maxLen) {
                        this.rawNumber = this.rawNumber.slice(0, this.cursor) + char + this.rawNumber.slice(this.cursor);
                        this.cursor++;
                        this.errorMsg = '';
                        this.render(false);
                    }
                }
            }
        }
    }
    
    private filterCountries() {
        // Simple search logic
        if (!this.searchBuffer) {
            this.filteredIndices = COUNTRIES.map((_, i) => i);
            return;
        }
        
        // Prioritize: Starts with ISO, Starts with Name, Fuzzy Name
        const buf = this.searchBuffer.toLowerCase();
        
        const matches = COUNTRIES.map((c, i) => {
            const iso = c[0].toLowerCase();
            const name = c[1].toLowerCase();
            const dial = c[2];
            
            let score = 0;
            if (iso.startsWith(buf)) score += 100;
            if (name.startsWith(buf)) score += 50;
            if (dial.startsWith(buf)) score += 20; // Search by code
            
            const fuzzy = fuzzyMatch(this.searchBuffer, c[1]);
            if (fuzzy) score += fuzzy.score;
            
            return { index: i, score };
        }).filter(x => x.score > 0)
          .sort((a, b) => b.score - a.score);
          
        this.filteredIndices = matches.map(m => m.index);
        
        // Auto-select first match
        if (this.filteredIndices.length > 0) {
            this.selectedCountryIndex = this.filteredIndices[0];
            
            // If we changed country, we should validate/truncate current rawNumber?
            // The mask might change.
            this.enforceMaxLen();
        }
    }
    
    private cycleCountry(dir: number) {
        // Cycle within filtered list
        const currentInFiltered = this.filteredIndices.indexOf(this.selectedCountryIndex);
        let nextIdx = currentInFiltered + dir;
        
        if (nextIdx < 0) nextIdx = this.filteredIndices.length - 1;
        if (nextIdx >= this.filteredIndices.length) nextIdx = 0;
        
        this.selectedCountryIndex = this.filteredIndices[nextIdx];
        this.enforceMaxLen();
    }
    
    private getMaxRawLength(): number {
        return this.mask.split('#').length - 1;
    }
    
    private enforceMaxLen() {
        const max = this.getMaxRawLength();
        if (this.rawNumber.length > max) {
            this.rawNumber = this.rawNumber.slice(0, max);
            if (this.cursor > max) this.cursor = max;
        }
    }

    private validateAndSubmit() {
        if (this.options.strict) {
            const max = this.getMaxRawLength();
            if (this.rawNumber.length !== max) {
                this.errorMsg = `Number too short (expected ${max} digits)`;
                this.render(false);
                return;
            }
        }
        
        // Validation callback
        const e164 = `+${this.dialCode}${this.rawNumber}`;
        if (this.options.validate) {
            const valid = this.options.validate(e164); // Pass strict format
             if (typeof valid === 'string') {
                 this.errorMsg = valid;
                 this.render(false);
                 return;
             }
             if (valid === false) {
                 this.errorMsg = 'Invalid phone number';
                 this.render(false);
                 return;
             }
        }

        this.submit(e164);
    }
    
    protected handleMouse(event: any) {
        if (event.action === 'press' || event.action === 'move') {
            // This is hard to map without exact coordinates of sections.
            // Simplified: Scroll changes country if active.
        }
        
        if (event.scroll) {
             if (this.activeSection === 'country') {
                 this.cycleCountry(event.scroll === 'up' ? -1 : 1);
                 this.render(false);
             }
        }
    }
}
