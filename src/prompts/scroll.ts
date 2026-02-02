import { Prompt } from '../base';
import { ANSI } from '../ansi';
import { theme } from '../theme';
import { symbols } from '../symbols';
import { ScrollOptions } from '../types';
import { stringWidth } from '../utils';

export class ScrollPrompt extends Prompt<boolean, ScrollOptions> {
    private lines: string[];
    private scrollTop: number = 0;
    private height: number;
    private hasReachedBottom: boolean = false;
    private showError: boolean = false;

    constructor(options: ScrollOptions) {
        super(options);
        // Normalize newlines and split content
        this.lines = (options.content || '').replace(/\r\n/g, '\n').split('\n');
        this.height = options.height || 15;
        
        // Initial check if content fits without scrolling
        if (this.lines.length <= this.height) {
            this.hasReachedBottom = true;
        }
    }

    protected render(_firstRender: boolean): void {
        const width = this.stdout.columns || 80;
        const contentWidth = width - 4; // Border (2) + Padding (2)
        
        // 1. Header & Progress
        const percent = Math.min(100, Math.round(((this.scrollTop + this.height) / Math.max(this.height, this.lines.length)) * 100));
        const header = `${theme.title}${symbols.pointer} ${ANSI.BOLD}${this.options.message}${ANSI.RESET} ${theme.muted}[${percent}%]${ANSI.RESET}`;
        
        // 2. Viewport
        const visibleLines = this.lines.slice(this.scrollTop, this.scrollTop + this.height);
        
        // Fill empty lines if content is shorter than height
        while (visibleLines.length < this.height) {
            visibleLines.push('');
        }

        const borderTop = `${theme.muted}${symbols.topLeft}${symbols.horizontal.repeat(width - 2)}${symbols.topRight}${ANSI.RESET}`;
        const borderBottom = `${theme.muted}${symbols.bottomLeft}${symbols.horizontal.repeat(width - 2)}${symbols.bottomRight}${ANSI.RESET}`;

        const contentRows = visibleLines.map(line => {
            let displayLine = line;
            const len = stringWidth(displayLine);
            if (len > contentWidth) {
                // Truncate
                displayLine = this.truncate(displayLine, contentWidth);
            } else {
                // Pad
                displayLine += ' '.repeat(contentWidth - len);
            }
            return `${theme.muted}${symbols.vertical}${ANSI.RESET} ${displayLine} ${theme.muted}${symbols.vertical}${ANSI.RESET}`;
        });

        // 3. Footer / Status
        let footer = '';
        if (this.showError) {
            footer = `${theme.error}>> Please scroll to the bottom before proceeding.${ANSI.RESET}`;
        } else if (this.options.requireScrollToBottom && !this.hasReachedBottom) {
            footer = `${theme.muted}(Scroll down to read more)${ANSI.RESET}`;
        } else {
            footer = `${theme.success}>> Press Enter to accept${ANSI.RESET}`;
        }

        const output = [
            header,
            borderTop,
            ...contentRows,
            borderBottom,
            footer
        ].join('\n');

        this.renderFrame(output);
    }

    protected handleInput(char: string, key: Buffer): void {
        // Enter
        if (char === '\r' || char === '\n') {
            if (this.options.requireScrollToBottom && !this.hasReachedBottom) {
                this.showError = true;
                this.render(false);
                return;
            }
            this.submit(true);
            return;
        }

        let didScroll = false;

        // Up / k
        if (this.isUp(char) || char === 'k') {
            if (this.scrollTop > 0) {
                this.scrollTop--;
                didScroll = true;
            }
        }
        // Down / j
        else if (this.isDown(char) || char === 'j') {
            if (this.scrollTop + this.height < this.lines.length) {
                this.scrollTop++;
                didScroll = true;
            }
        }
        // PageUp
        else if (key.toString('hex') === '1b5b357e') { // Standard PageUp sequence
             this.scrollTop = Math.max(0, this.scrollTop - this.height);
             didScroll = true;
        }
        // PageDown / Space
        else if (char === ' ' || key.toString('hex') === '1b5b367e') { // Standard PageDown sequence
            this.scrollTop = Math.min(this.lines.length - this.height, this.scrollTop + this.height);
            if (this.scrollTop < 0) this.scrollTop = 0; // Fix if content < height
            didScroll = true;
        }
        // Home
        else if (key.toString('hex') === '1b5b48') {
             this.scrollTop = 0;
             didScroll = true;
        }
        // End
        else if (key.toString('hex') === '1b5b46') {
             this.scrollTop = Math.max(0, this.lines.length - this.height);
             didScroll = true;
        }

        if (didScroll) {
            this.showError = false;
            // Check if reached bottom
            if (this.scrollTop + this.height >= this.lines.length) {
                this.hasReachedBottom = true;
            }
            this.render(false);
        }
    }

    protected handleMouse(event: import('../types').MouseEvent): void {
        if (event.action === 'scroll') {
            let didScroll = false;
            if (event.scroll === 'up') {
                if (this.scrollTop > 0) {
                    this.scrollTop--;
                    didScroll = true;
                }
            } else if (event.scroll === 'down') {
                if (this.scrollTop + this.height < this.lines.length) {
                    this.scrollTop++;
                    didScroll = true;
                }
            }

            if (didScroll) {
                this.showError = false;
                if (this.scrollTop + this.height >= this.lines.length) {
                    this.hasReachedBottom = true;
                }
                this.render(false);
            }
        }
    }
}
