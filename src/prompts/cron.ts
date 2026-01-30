import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { CronOptions, MouseEvent } from '../types';

interface FieldConfig {
    label: string;
    min: number;
    max: number;
}

const FIELDS: FieldConfig[] = [
    { label: 'Minute', min: 0, max: 59 },
    { label: 'Hour', min: 0, max: 23 },
    { label: 'Day', min: 1, max: 31 },
    { label: 'Month', min: 1, max: 12 },
    { label: 'Weekday', min: 0, max: 6 }
];

export class CronPrompt extends Prompt<string, CronOptions> {
    private fields: string[] = ['*', '*', '*', '*', '*'];
    private activeField: number = 0;
    private buffer: string = '';

    constructor(options: CronOptions) {
        super(options);
        if (options.initial) {
            const parts = options.initial.split(' ');
            if (parts.length === 5) {
                this.fields = parts;
            }
        }
    }

    private get currentConfig() {
        return FIELDS[this.activeField];
    }

    protected render(_firstRender: boolean): void {
        let output = `${theme.success}?${ANSI.RESET} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET}\n`;
        
        // Render fields
        let fieldsStr = '';
        this.fields.forEach((val, index) => {
            const isSelected = index === this.activeField;
            const displayVal = val.padStart(2, ' ');
            
            if (isSelected) {
                fieldsStr += `${theme.main}${ANSI.UNDERLINE}${displayVal}${ANSI.RESET} `;
            } else {
                fieldsStr += `${ANSI.DIM}${displayVal}${ANSI.RESET} `;
            }
        });
        
        output += `  ${fieldsStr}\n`;
        
        // Render Label and Hints
        const config = this.currentConfig;
        output += `  ${theme.muted}${config.label} (${config.min}-${config.max})${ANSI.RESET}\n`;
        output += `  ${ANSI.DIM}(Arrows: Adjust | Space: Toggle * | 0-9: Type | Tab: Next)${ANSI.RESET}`;

        this.renderFrame(output);
    }

    private validateCurrentField() {
        const config = this.currentConfig;
        const val = this.fields[this.activeField];
        if (val === '*') return;
        
        let num = parseInt(val);
        if (isNaN(num)) {
            this.fields[this.activeField] = config.min.toString();
        } else {
            num = Math.max(config.min, Math.min(num, config.max));
            this.fields[this.activeField] = num.toString();
        }
    }

    protected handleInput(char: string) {
        if (char === '\r' || char === '\n') {
            this.validateCurrentField();
            this.submit(this.fields.join(' '));
            return;
        }

        if (char === '\t' || this.isRight(char)) {
            this.validateCurrentField();
            this.activeField = (this.activeField + 1) % 5;
            this.buffer = '';
            this.render(false);
            return;
        }

        // Shift+Tab detection is often '\x1b[Z'
        if (char === '\x1b[Z' || this.isLeft(char)) {
            this.validateCurrentField();
            this.activeField = (this.activeField - 1 + 5) % 5;
            this.buffer = '';
            this.render(false);
            return;
        }

        const config = this.currentConfig;
        const currentVal = this.fields[this.activeField];
        let numVal = parseInt(currentVal);

        if (this.isUp(char)) {
            if (currentVal === '*') {
                this.fields[this.activeField] = config.min.toString();
            } else if (!isNaN(numVal)) {
                numVal++;
                if (numVal > config.max) numVal = config.min;
                this.fields[this.activeField] = numVal.toString();
            }
            this.buffer = '';
            this.render(false);
            return;
        }

        if (this.isDown(char)) {
            if (currentVal === '*') {
                this.fields[this.activeField] = config.max.toString();
            } else if (!isNaN(numVal)) {
                numVal--;
                if (numVal < config.min) numVal = config.max;
                this.fields[this.activeField] = numVal.toString();
            }
            this.buffer = '';
            this.render(false);
            return;
        }

        if (char === ' ' || char.toLowerCase() === 'x') {
            this.fields[this.activeField] = '*';
            this.buffer = '';
            this.render(false);
            return;
        }

        // Direct Input
        if (/^[0-9]$/.test(char)) {
            const nextBuffer = this.buffer + char;
            const nextNum = parseInt(nextBuffer);
            
            // Check if valid
            if (!isNaN(nextNum) && nextNum <= config.max) {
                this.buffer = nextBuffer;
                
                if (nextNum >= 0) { // Should be positive
                     this.fields[this.activeField] = nextNum.toString();
                }
            } else {
                 const freshNum = parseInt(char);
                 if (!isNaN(freshNum) && freshNum <= config.max) {
                     this.buffer = char;
                     this.fields[this.activeField] = freshNum.toString();
                 }
            }
            this.render(false);
        }
    }

    protected handleMouse(event: MouseEvent) {
         if (event.action === 'scroll') {
             const config = this.currentConfig;
             const currentVal = this.fields[this.activeField];
             let numVal = parseInt(currentVal);

            if (event.scroll === 'up') { // Increase
                 if (currentVal === '*') {
                    this.fields[this.activeField] = config.min.toString();
                } else if (!isNaN(numVal)) {
                    numVal++;
                    if (numVal > config.max) numVal = config.min;
                    this.fields[this.activeField] = numVal.toString();
                }
            } else { // Decrease
                 if (currentVal === '*') {
                    this.fields[this.activeField] = config.max.toString();
                } else if (!isNaN(numVal)) {
                    numVal--;
                    if (numVal < config.min) numVal = config.max;
                    this.fields[this.activeField] = numVal.toString();
                }
            }
            this.buffer = '';
            this.render(false);
        }
    }
}
