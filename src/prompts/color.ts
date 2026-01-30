import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { ColorOptions, MouseEvent } from '../types';

interface RGB {
    r: number;
    g: number;
    b: number;
}

export class ColorPrompt extends Prompt<string, ColorOptions> {
    private rgb: RGB;
    private activeChannel: 'r' | 'g' | 'b' = 'r';
    private inputBuffer: string = '';

    constructor(options: ColorOptions) {
        super(options);
        this.rgb = this.parseHex(options.initial || '#000000');
    }

    private parseHex(hex: string): RGB {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    private rgbToHex(r: number, g: number, b: number): string {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    }
    
    // Helper to format ANSI TrueColor background
    private getBgColorCode(r: number, g: number, b: number): string {
        return `\x1b[48;2;${r};${g};${b}m`;
    }

    protected render(_firstRender: boolean): void {
        const { r, g, b } = this.rgb;
        const hex = this.rgbToHex(r, g, b);
        
        let output = `${theme.title}${this.options.message}${ANSI.RESET} `;
        output += `${ANSI.BOLD}${hex}${ANSI.RESET}\n\n`;
        
        // Preview Block
        if (this.capabilities.hasTrueColor) {
            const bg = this.getBgColorCode(r, g, b);
            const block = `${bg}        ${ANSI.RESET}`; // 8 spaces
            output += `  ${block}\n`;
            output += `  ${block}\n`;
            output += `  ${block}\n\n`;
        } else {
            // Fallback for no true color?
            // Maybe just show text or use closest 256 color?
            // For now, simpler fallback:
            output += `  (Preview unavailable in this terminal)\n\n`;
        }
        
        // Sliders
        const channels: ('r' | 'g' | 'b')[] = ['r', 'g', 'b'];
        const labels = { r: 'Red  ', g: 'Green', b: 'Blue ' };
        
        channels.forEach(ch => {
            const val = this.rgb[ch];
            const isActive = this.activeChannel === ch;
            
            // Render slider track
            // Width 20 chars for 0-255
            const width = 20;
            const pos = Math.floor((val / 255) * width);
            // Wait, '⚪' might be wide. using simpler char if needed. 'O' or ANSI reverse space.
            // Let's use standard chars.
            const trackSimple = '━'.repeat(pos) + (isActive ? '●' : '○') + '─'.repeat(width - pos);
            
            let line = `${labels[ch]}: ${val.toString().padStart(3)} [${trackSimple}]`;
            
            if (isActive) {
                line = `${theme.main}${ANSI.REVERSE} ${line} ${ANSI.RESET}`;
            } else {
                 line = ` ${line} `;
            }
            output += line + '\n';
        });

        output += `\n${theme.muted}Arrows: Adjust/Switch | Shift+Arrows: Adjust fast | Enter: Submit${ANSI.RESET}`;

        this.renderFrame(output);
    }

    protected handleInput(char: string, _key: Buffer): void {
        const isUp = this.isUp(char);
        const isDown = this.isDown(char);
        const isLeft = this.isLeft(char);
        const isRight = this.isRight(char);
        
        // Detect Shift key for faster movement (generic check if possible, or mapping specific codes)
        // \x1b[1;2C is Shift+Right usually. \x1b[1;2D is Shift+Left.
        // It varies by terminal.
        const isShiftRight = char === '\x1b[1;2C';
        const isShiftLeft = char === '\x1b[1;2D';

        // Channel Switching (Up/Down)
        if (isUp) {
            if (this.activeChannel === 'g') this.activeChannel = 'r';
            else if (this.activeChannel === 'b') this.activeChannel = 'g';
            this.render(false);
            return;
        }
        if (isDown) {
             if (this.activeChannel === 'r') this.activeChannel = 'g';
             else if (this.activeChannel === 'g') this.activeChannel = 'b';
             this.render(false);
             return;
        }

        // Value Adjustment (Left/Right)
        if (isLeft || isRight || isShiftLeft || isShiftRight) {
            let change = 0;
            if (isRight) change = 1;
            if (isLeft) change = -1;
            if (isShiftRight) change = 10;
            if (isShiftLeft) change = -10;
            
            const val = this.rgb[this.activeChannel] + change;
            this.rgb[this.activeChannel] = Math.max(0, Math.min(255, val));
            this.render(false);
            return;
        }
        
        // Tab to cycle channels
        if (char === '\t') {
            if (this.activeChannel === 'r') this.activeChannel = 'g';
            else if (this.activeChannel === 'g') this.activeChannel = 'b';
            else this.activeChannel = 'r';
            this.render(false);
            return;
        }

        if (char === '\r' || char === '\n') {
            this.submit(this.rgbToHex(this.rgb.r, this.rgb.g, this.rgb.b));
            return;
        }
    }

    protected handleMouse(event: MouseEvent): void {
        if (event.action === 'scroll') {
            // On scroll, adjust the currently active channel's value.
            // If Ctrl is held, adjust by a larger step (fast adjust).
            const fast = !!event.ctrl;
            const step = fast ? 10 : 1;
            const change = event.scroll === 'up' ? step : (event.scroll === 'down' ? -step : 0);
            if (change !== 0) {
                const val = this.rgb[this.activeChannel] + change;
                this.rgb[this.activeChannel] = Math.max(0, Math.min(255, val));
                this.render(false);
            }
        }
    }
}
