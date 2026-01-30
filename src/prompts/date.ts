import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { symbols } from '../symbols';
import { DateOptions, MouseEvent } from '../types';

// --- Implementation: Date Prompt ---
export class DatePrompt extends Prompt<Date, DateOptions> {
    private selectedField: number = 0; // 0: Year, 1: Month, 2: Day, 3: Hour, 4: Minute
    private errorMsg: string = '';
    private inputBuffer: string = '';

    constructor(options: DateOptions) {
        super(options);
        this.value = options.initial || new Date();
    }

    protected render(_firstRender: boolean) {
        // Date formatting
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
        
        const icon = this.errorMsg ? `${theme.error}${symbols.cross}` : `${theme.success}?`;
        const dateStr = `${display[0]}-${display[1]}-${display[2]} ${display[3]}:${display[4]}`;
        
        let output = `${icon} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET} ${dateStr} ${theme.muted}(Use arrows or type)${ANSI.RESET}`;

        if (this.errorMsg) {
            output += `\n${theme.error}>> ${this.errorMsg}${ANSI.RESET}`;
        }
        
        this.renderFrame(output);
    }

    protected handleInput(char: string) {
	if (char === '\r' || char === '\n') {
            // Min constraint check
            if (this.options.min && this.value < this.options.min) {
                this.errorMsg = 'Date cannot be before minimum allowed.';
                this.render(false);
                return;
            }
            // Max constraint check
            if (this.options.max && this.value > this.options.max) {
                this.errorMsg = 'Date cannot be after maximum allowed.';
                this.render(false);
                return;
            }

            this.submit(this.value);
            return;
        }

        if (char === '\t' || this.isRight(char)) { // Right / Tab
            if (char === '\t') {
                this.selectedField = (this.selectedField + 1) % 5;
            } else {
                this.selectedField = Math.min(4, this.selectedField + 1);
            }
            this.inputBuffer = ''; // Reset buffer on move
            this.errorMsg = '';
            this.render(false);
            return;
        }

        if (char === '\x1b[Z' || this.isLeft(char)) { // Left / Shift+Tab
            if (char === '\x1b[Z') {
                this.selectedField = (this.selectedField - 1 + 5) % 5;
            } else {
                this.selectedField = Math.max(0, this.selectedField - 1);
            }
            this.inputBuffer = ''; // Reset buffer on move
            this.errorMsg = '';
            this.render(false);
            return;
        }

        // Support numeric input
        if (/^\d$/.test(char)) {
            const maxLen = this.selectedField === 0 ? 4 : 2;
            let nextBuffer = this.inputBuffer + char;
            
            if (nextBuffer.length > maxLen) {
                nextBuffer = char;
            }

            const val = parseInt(nextBuffer, 10);
            let valid = true;
            
            if (this.selectedField === 1 && (val < 1 || val > 12)) valid = false; // Month
            if (this.selectedField === 2 && (val < 1 || val > 31)) valid = false; // Day (rough check)
            if (this.selectedField === 3 && (val > 23)) valid = false; // Hour
            if (this.selectedField === 4 && (val > 59)) valid = false; // Minute

            if (!valid) {
                nextBuffer = char;
            }

            this.inputBuffer = nextBuffer;
            const finalVal = parseInt(this.inputBuffer, 10);

            const d = new Date(this.value);
            
            if (this.selectedField === 0) {
                 d.setFullYear(finalVal);
            }
            else if (this.selectedField === 1) d.setMonth(Math.max(0, Math.min(11, finalVal - 1)));
            else if (this.selectedField === 2) d.setDate(Math.max(1, Math.min(31, finalVal)));
            else if (this.selectedField === 3) d.setHours(Math.max(0, Math.min(23, finalVal)));
            else if (this.selectedField === 4) d.setMinutes(Math.max(0, Math.min(59, finalVal)));
            
            this.value = d;

	    // Check immediately after updating the value to display an error message (but still allow further input)
	    if (this.options.min && this.value < this.options.min) {
                 this.errorMsg = 'Warning: Date is before minimum.';
            } else if (this.options.max && this.value > this.options.max) {
                 this.errorMsg = 'Warning: Date is after maximum.';
            } else {
                 this.errorMsg = '';
            }

            this.render(false);
            return;
        }

        // Support standard and application cursor keys
        const isUp = this.isUp(char);
        const isDown = this.isDown(char);

        if (isUp || isDown) {
            this.inputBuffer = ''; // Reset buffer on arrow move
            const dir = isUp ? 1 : -1;
            this.adjustDate(dir);
        }
    }

    protected handleMouse(event: MouseEvent) {
        if (event.action === 'scroll') {
            if (event.scroll === 'up') {
                this.adjustDate(1);
            } else if (event.scroll === 'down') {
                this.adjustDate(-1);
            }
        }
    }

    private adjustDate(dir: number) {
        const d = new Date(this.value);
        
        switch (this.selectedField) {
            case 0: d.setFullYear(d.getFullYear() + dir); break;
            case 1: d.setMonth(d.getMonth() + dir); break;
            case 2: d.setDate(d.getDate() + dir); break;
            case 3: d.setHours(d.getHours() + dir); break;
            case 4: d.setMinutes(d.getMinutes() + dir); break;
        }

	this.value = d;

	if (this.options.min && this.value < this.options.min) {
              this.errorMsg = 'Date cannot be before minimum allowed.';
  	} else if (this.options.max && this.value > this.options.max) {
     	      this.errorMsg = 'Date cannot be after maximum allowed.';
  	} else {
              this.errorMsg = '';
        }

   	this.render(false);
    }
}