import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { symbols } from '../symbols';
import { IPOptions, MouseEvent } from '../types';

export class IPPrompt extends Prompt<string, IPOptions> {
    private octets: string[] = ['', '', '', ''];
    private activeOctet: number = 0;
    private errorMsg: string = '';

    constructor(options: IPOptions) {
        super(options);
        if (options.initial) {
            const parts = options.initial.split('.');
            if (parts.length === 4) {
                this.octets = parts.map(p => {
                    const num = parseInt(p, 10);
                    return !isNaN(num) && num >= 0 && num <= 255 ? p : '';
                });
            }
        }
    }

    protected render(_firstRender: boolean) {
        let output = '';

        // Title
        const icon = this.errorMsg ? `${theme.error}${symbols.cross}` : `${theme.success}?`;
        output += `${icon} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET}\n`;

        // IP Render
        const partsDisplay = this.octets.map((octet, index) => {
            const isEmpty = octet.length === 0;
            let displayVal = isEmpty ? '_' : octet;
            
            if (index === this.activeOctet) {
                // Highlight active
                displayVal = `${theme.main}${ANSI.UNDERLINE}${displayVal}${ANSI.RESET}`;
            }
            return displayVal;
        });

        output += `  ${partsDisplay.join('.')}`;

        if (this.errorMsg) {
            output += `\n${theme.error}>> ${this.errorMsg}${ANSI.RESET}`;
        }

        this.renderFrame(output);
    }

    protected handleInput(char: string) {
        this.errorMsg = '';

        if (char === '\r' || char === '\n') {
            if (this.octets.every(o => o.length > 0)) {
                this.submit(this.octets.join('.'));
            } else {
                this.errorMsg = 'Invalid IP address';
                this.render(false);
            }
            return;
        }

        if (char === '\u0008' || char === '\x7f') { // Backspace
            const current = this.octets[this.activeOctet];
            if (current.length > 0) {
                this.octets[this.activeOctet] = current.slice(0, -1);
            } else if (this.activeOctet > 0) {
                this.activeOctet--;
            }
            this.render(false);
            return;
        }

        // Navigation
        if (this.isLeft(char) && this.activeOctet > 0) {
            this.activeOctet--;
            this.render(false);
            return;
        }
        if (this.isRight(char) && this.activeOctet < 3) {
            this.activeOctet++;
            this.render(false);
            return;
        }

        // Dot navigation
        if (char === '.') {
            if (this.activeOctet < 3) {
                this.activeOctet++;
                this.render(false);
            }
            return;
        }

        // Numbers
        if (/^\d$/.test(char)) {
            const current = this.octets[this.activeOctet];
            const newValue = current + char;
            
            if (parseInt(newValue, 10) <= 255) {
                this.octets[this.activeOctet] = newValue;
                
                // Auto-jump if 3 digits
                if (newValue.length === 3 && this.activeOctet < 3) {
                    this.activeOctet++;
                }
                this.render(false);
            }
        }
    }

    protected handleMouse(event: MouseEvent) {
        if (event.action === 'scroll') {
            if (event.scroll === 'up') {
                 if (this.activeOctet > 0) {
                     this.activeOctet--;
                     this.render(false);
                 }
            } else if (event.scroll === 'down') {
                if (this.activeOctet < 3) {
                    this.activeOctet++;
                    this.render(false);
                }
            }
        }
    }
}
