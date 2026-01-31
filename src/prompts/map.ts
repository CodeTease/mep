import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { symbols } from '../symbols';
import { MapOptions, MouseEvent } from '../types';
import { stringWidth } from '../utils';

interface MapItem {
    key: string;
    value: string;
}

export class MapPrompt extends Prompt<Record<string, string>, MapOptions> {
    private items: MapItem[] = [];
    private rowIndex: number = 0;
    private colIndex: number = 0; // 0: Key, 1: Value
    private scrollTop: number = 0;
    private readonly pageSize: number = 7;
    private errorMsg: string = '';

    constructor(options: MapOptions) {
        super(options);
        if (options.initial) {
            this.items = Object.entries(options.initial).map(([key, value]) => ({ key, value }));
        }
        if (this.items.length === 0) {
            this.items.push({ key: '', value: '' });
        }
    }

    protected render(_firstRender: boolean) {
        let output = '';

        // Title
        const icon = this.errorMsg ? `${theme.error}${symbols.cross}` : `${theme.success}?`;
        output += `${icon} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET}\n`;

        // Layout Calculation
        const maxKeyWidth = Math.max(
            5, // Minimum width
            ...this.items.map(item => stringWidth(item.key))
        ) + 2; // Padding

        // Scrolling Logic
        if (this.rowIndex < this.scrollTop) {
            this.scrollTop = this.rowIndex;
        } else if (this.rowIndex >= this.scrollTop + this.pageSize) {
            this.scrollTop = this.rowIndex - this.pageSize + 1;
        }
        // Clamping
        const maxScroll = Math.max(0, this.items.length - this.pageSize);
        this.scrollTop = Math.min(this.scrollTop, maxScroll);

        // Header
        const keyHeader = this.pad('Key', maxKeyWidth);
        output += `  ${ANSI.BOLD}${keyHeader}Value${ANSI.RESET}\n`;

        // Rows
        const visibleItems = this.items.slice(this.scrollTop, this.scrollTop + this.pageSize);
        
        visibleItems.forEach((item, index) => {
             const actualIndex = this.scrollTop + index;
             if (index > 0) output += '\n';

             const isRowActive = actualIndex === this.rowIndex;
             const pointer = isRowActive ? `${theme.main}${symbols.pointer}${ANSI.RESET} ` : '  ';
             
             // Render Key
             let keyStr = item.key;
             if (isRowActive && this.colIndex === 0) {
                 keyStr = `${theme.main}${ANSI.UNDERLINE}${keyStr}${ANSI.RESET}`;
             }
             // Adjust padding manually because ANSI codes mess up simple padEnd
             const keyVisualWidth = stringWidth(item.key);
             const padding = ' '.repeat(Math.max(0, maxKeyWidth - keyVisualWidth));
             
             // Render Value
             let valStr = item.value;
             if (isRowActive && this.colIndex === 1) {
                 valStr = `${theme.main}${ANSI.UNDERLINE}${valStr || ' '}${ANSI.RESET}`;
             }

             output += `${pointer}${keyStr}${padding}${valStr}`;
        });

        // Instructions
        output += `\n${ANSI.DIM}(Ctrl+N: Add, Ctrl+D: Del)${ANSI.RESET}`;

        if (this.errorMsg) {
             output += `\n${theme.error}>> ${this.errorMsg}${ANSI.RESET}`;
        }

        this.renderFrame(output);
    }

    private pad(str: string, width: number): string {
        const len = stringWidth(str);
        if (len >= width) return str;
        return str + ' '.repeat(width - len);
    }

    protected handleInput(char: string) {
        this.errorMsg = '';
        
        // Navigation
        if (this.isUp(char)) {
            if (this.rowIndex > 0) this.rowIndex--;
            this.render(false);
            return;
        }
        if (this.isDown(char)) {
            if (this.rowIndex < this.items.length - 1) {
                this.rowIndex++;
            } else {
                 // Down at last row adds new row
                 this.items.push({ key: '', value: '' });
                 this.rowIndex++;
                 this.colIndex = 0; // Optional: Reset to Key col when creating new row
            }
            this.render(false);
            return;
        }
        if (char === '\t' || this.isRight(char) || this.isLeft(char)) {
            // Toggle column
            this.colIndex = this.colIndex === 0 ? 1 : 0;
            this.render(false);
            return;
        }

        // CRUD
        // Ctrl+N (Standard ASCII for Ctrl+N is \x0e)
        if (char === '\x0e') {
            this.items.push({ key: '', value: '' });
            this.rowIndex = this.items.length - 1;
            this.colIndex = 0;
            this.render(false);
            return;
        }

        // Ctrl+D (Standard ASCII for Ctrl+D is \x04)
        if (char === '\x04') {
            if (this.items.length > 1) {
                this.items.splice(this.rowIndex, 1);
                if (this.rowIndex >= this.items.length) {
                    this.rowIndex = this.items.length - 1;
                }
            } else {
                // Clear the last remaining item instead of deleting it
                this.items[0] = { key: '', value: '' };
            }
            this.render(false);
            return;
        }

        // Submit
        if (char === '\r' || char === '\n') {
            // Validate duplicates
            const keys = this.items.map(i => i.key);
            const duplicates = keys.filter((item, index) => keys.indexOf(item) !== index && item !== '');
            if (duplicates.length > 0) {
                this.errorMsg = `Duplicate keys found: ${duplicates.join(', ')}`;
                this.render(false);
                return;
            }
            if (keys.some(k => k === '')) {
                 this.errorMsg = 'Keys cannot be empty';
                 this.render(false);
                 return;
            }

            const result: Record<string, string> = {};
            this.items.forEach(item => {
                result[item.key] = item.value;
            });
            this.submit(result);
            return;
        }
        
        // Backspace
        if (char === '\u0008' || char === '\x7f') {
            const item = this.items[this.rowIndex];
            if (this.colIndex === 0) {
                if (item.key.length > 0) item.key = item.key.slice(0, -1);
            } else {
                 if (item.value.length > 0) item.value = item.value.slice(0, -1);
            }
            this.render(false);
            return;
        }

        // Typing
        if (!/^[\x00-\x1F]/.test(char)) {
             const item = this.items[this.rowIndex];
             if (this.colIndex === 0) {
                 item.key += char;
             } else {
                 item.value += char;
             }
             this.render(false);
        }
    }

    protected handleMouse(event: MouseEvent) {
        if (event.action === 'scroll') {
            if (event.scroll === 'up') {
                if (this.rowIndex > 0) {
                    this.rowIndex--;
                    this.render(false);
                }
            } else if (event.scroll === 'down') {
                if (this.rowIndex < this.items.length - 1) {
                    this.rowIndex++;
                    this.render(false);
                }
            }
        }
    }
}
