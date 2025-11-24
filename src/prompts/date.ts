import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { DateOptions } from '../types';

// --- Implementation: Date Prompt ---
export class DatePrompt extends Prompt<Date, DateOptions> {
    private selectedField: number = 0; // 0: Year, 1: Month, 2: Day, 3: Hour, 4: Minute
    private errorMsg: string = '';
    private inputBuffer: string = '';

    constructor(options: DateOptions) {
        super(options);
        this.value = options.initial || new Date();
    }

    protected render(firstRender: boolean) {
        this.print(ANSI.HIDE_CURSOR);
        if (!firstRender) {
            this.print(ANSI.ERASE_LINE + ANSI.CURSOR_LEFT);
             if (this.errorMsg) {
                 this.print(ANSI.UP + ANSI.ERASE_LINE + ANSI.CURSOR_LEFT);
             }
        }

        const y = this.value.getFullYear();
        const m = (this.value.getMonth() + 1).toString().padStart(2, '0');
        const d = this.value.getDate().toString().padStart(2, '0');
        const h = this.value.getHours().toString().padStart(2, '0');
        const min = this.value.getMinutes().toString().padStart(2, '0');

        const fields = [y, m, d, h, min];
        const display = fields.map((val, i) => {
            if (i === this.selectedField) return `${theme.main}${ANSI.UNDERLINE}${val}${ANSI.RESET}`;
            return val;
        });
        
        const icon = this.errorMsg ? `${theme.error}✖` : `${theme.success}?`;
        const dateStr = `${display[0]}-${display[1]}-${display[2]} ${display[3]}:${display[4]}`;
        this.print(`${icon} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET} ${dateStr} ${theme.muted}(Use arrows or type)${ANSI.RESET}`);

        if (this.errorMsg) {
            this.print(`\n${ANSI.ERASE_LINE}${theme.error}>> ${this.errorMsg}${ANSI.RESET}`);
            this.print(ANSI.UP); 
            // restore cursor pos logic isn't needed as we are on one line mostly, but for consistency:
             const promptLen = this.options.message.length + 3; // roughly
             this.print(`\x1b[1000D\x1b[${promptLen + 15}C`); // approx move back
        }
    }

    protected handleInput(char: string) {
        if (char === '\r' || char === '\n') {
            this.submit(this.value);
            return;
        }

        if (this.isLeft(char)) { // Left
            this.selectedField = Math.max(0, this.selectedField - 1);
            this.inputBuffer = ''; // Reset buffer on move
            this.errorMsg = '';
            this.render(false);
            return;
        }
        if (this.isRight(char)) { // Right
            this.selectedField = Math.min(4, this.selectedField + 1);
            this.inputBuffer = ''; // Reset buffer on move
            this.errorMsg = '';
            this.render(false);
            return;
        }

        // Support numeric input
        if (/^\d$/.test(char)) {
            const maxLen = this.selectedField === 0 ? 4 : 2;
            let nextBuffer = this.inputBuffer + char;
            
            // If we exceed max length, reset to just the new char (assuming user is starting a new number)
            // Or better: try to parse.
            
            // Logic: 
            // 1. Try appending.
            // 2. Validate.
            // 3. If valid, keep.
            // 4. If invalid (e.g. Month 13), assume new start -> set buffer to just char.
            
            // However, we must respect field limits first.
            if (nextBuffer.length > maxLen) {
                nextBuffer = char;
            }

            const val = parseInt(nextBuffer, 10);
            let valid = true;
            
            // Pre-validation to decide if we should append or reset
            if (this.selectedField === 1 && (val < 1 || val > 12)) valid = false; // Month
            if (this.selectedField === 2 && (val < 1 || val > 31)) valid = false; // Day (rough check)
            if (this.selectedField === 3 && (val > 23)) valid = false; // Hour
            if (this.selectedField === 4 && (val > 59)) valid = false; // Minute

            if (!valid) {
                // If appending made it invalid (e.g. was '1', typed '3' -> '13' invalid month),
                // treat '3' as the start of a new number.
                nextBuffer = char;
            }

            this.inputBuffer = nextBuffer;
            const finalVal = parseInt(this.inputBuffer, 10);

            const d = new Date(this.value);
            
            if (this.selectedField === 0) {
                 // Year is special, we just set it. 
                 d.setFullYear(finalVal);
            }
            else if (this.selectedField === 1) d.setMonth(Math.max(0, Math.min(11, finalVal - 1)));
            else if (this.selectedField === 2) d.setDate(Math.max(1, Math.min(31, finalVal)));
            else if (this.selectedField === 3) d.setHours(Math.max(0, Math.min(23, finalVal)));
            else if (this.selectedField === 4) d.setMinutes(Math.max(0, Math.min(59, finalVal)));
            
            this.value = d;
            this.errorMsg = '';
            this.render(false);
            return;
        }

        // Support standard and application cursor keys
        const isUp = this.isUp(char);
        const isDown = this.isDown(char);

        if (isUp || isDown) {
            this.inputBuffer = ''; // Reset buffer on arrow move
            const dir = isUp ? 1 : -1;
            const d = new Date(this.value);
            
            switch (this.selectedField) {
                case 0: d.setFullYear(d.getFullYear() + dir); break;
                case 1: d.setMonth(d.getMonth() + dir); break;
                case 2: d.setDate(d.getDate() + dir); break;
                case 3: d.setHours(d.getHours() + dir); break;
                case 4: d.setMinutes(d.getMinutes() + dir); break;
            }

            let valid = true;
            if (this.options.min && d < this.options.min) {
                 this.errorMsg = 'Date cannot be before minimum allowed.';
                 valid = false;
            }
            if (this.options.max && d > this.options.max) {
                 this.errorMsg = 'Date cannot be after maximum allowed.';
                 valid = false;
            }

            if (valid) {
                this.value = d;
                this.errorMsg = '';
            }
            this.render(false);
        }
    }
}
