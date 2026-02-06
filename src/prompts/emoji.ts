import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { EmojiOptions, EmojiItem, MouseEvent } from '../types';
import { stringWidth } from '../utils';

export class EmojiPrompt extends Prompt<string, EmojiOptions> {
    private search: string = '';
    private cursor: number = 0; // Index in the filtered list
    private filtered: EmojiItem[] = [];
    private sortedEmojis: EmojiItem[] = [];
    private cols: number = 0;
    private scrollTop: number = 0;
    private pageSize: number = 8; // Number of rows to display

    constructor(options: EmojiOptions) {
        super(options);

        // Sort emojis by recent
        this.sortedEmojis = [...options.emojis];
        if (options.recent && options.recent.length > 0) {
            const recentSet = new Set(options.recent);
            this.sortedEmojis.sort((a, b) => {
                const aRecent = recentSet.has(a.name);
                const bRecent = recentSet.has(b.name);
                if (aRecent && !bRecent) return -1;
                if (!aRecent && bRecent) return 1;
                return 0;
            });
        }

        this.checkWindowsAttention();

        // Initial filter
        this.filtered = this.sortedEmojis;

        // Calculate layout
        this.calculateLayout();
    }

    private calculateLayout() {
        if (this.options.cols) {
            this.cols = this.options.cols;
        } else {
            // Auto-detect based on terminal width
            // Assume each emoji cell takes ~4 chars (2 char emoji + 2 padding)
            const termWidth = process.stdout.columns || 80;
            this.cols = Math.floor((termWidth - 4) / 4); // -4 for margin
            if (this.cols < 1) this.cols = 1;
        }
    }

    private updateFilter() {
        if (!this.search) {
            this.filtered = this.sortedEmojis;
        } else {
            const lowerSearch = this.search.toLowerCase();
            this.filtered = this.sortedEmojis.filter(e =>
                e.name.toLowerCase().includes(lowerSearch) ||
                (e.description && e.description.toLowerCase().includes(lowerSearch)) ||
                e.char === this.search // Allow searching by exact char
            );
        }
        this.cursor = 0;
        this.scrollTop = 0;
    }

    protected render(_firstRender: boolean): void {
        // Prepare header (Search bar)
        const icon = `${theme.success}?`;
        const title = `${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET}`;
        const searchDisplay = this.search ? `${theme.main}${this.search}${ANSI.RESET}` : `${theme.muted}Type to search...${ANSI.RESET}`;

        let output = `${icon} ${title} ${searchDisplay}\n`;

        // Render Grid
        if (this.filtered.length === 0) {
            output += `\n${theme.error}No results found.${ANSI.RESET}\n`;
        } else {
            const totalRows = Math.ceil(this.filtered.length / this.cols);
            const startRow = this.scrollTop;
            const endRow = Math.min(totalRows, startRow + this.pageSize);

            for (let r = startRow; r < endRow; r++) {
                let rowStr = '  '; // Left margin
                for (let c = 0; c < this.cols; c++) {
                    const idx = r * this.cols + c;
                    if (idx >= this.filtered.length) break;

                    const item = this.filtered[idx];
                    const isSelected = idx === this.cursor;

                    // Render Emoji
                    // Align center in 4 chars
                    // Emoji width is typically 2.
                    const emoji = item.char;
                    const width = stringWidth(emoji);
                    const padding = 4 - width;
                    const leftPad = Math.floor(padding / 2);
                    const rightPad = padding - leftPad;

                    let cell = `${' '.repeat(leftPad)}${emoji}${' '.repeat(rightPad)}`;

                    if (isSelected) {
                        cell = `${ANSI.REVERSE}${cell}${ANSI.RESET}`;
                    }

                    rowStr += cell;
                }
                output += rowStr + '\n';
            }

            // Footer (Preview of selected)
            if (this.filtered.length > 0) {
                const selectedItem = this.filtered[this.cursor];
                output += `\n${ANSI.BOLD}${selectedItem.char}  ${selectedItem.name}${ANSI.RESET}`;
                if (selectedItem.description) {
                    output += ` - ${theme.muted}${selectedItem.description}${ANSI.RESET}`;
                }
            } else {
                output += '\n'; // Spacer
            }
        }

        // Navigation hints
        // output += `\n${theme.muted}Arrows to navigate, Enter to select${ANSI.RESET}`;

        this.renderFrame(output);
    }

    protected handleInput(char: string): void {
        // Navigation
        if (this.isUp(char)) {
            if (this.filtered.length === 0) return;
            const newCursor = this.cursor - this.cols;
            if (newCursor >= 0) {
                this.cursor = newCursor;
            }
            this.adjustScroll();
            this.render(false);
            return;
        }

        if (this.isDown(char)) {
            if (this.filtered.length === 0) return;
            const newCursor = this.cursor + this.cols;
            if (newCursor < this.filtered.length) {
                this.cursor = newCursor;
            }
            this.adjustScroll();
            this.render(false);
            return;
        }

        if (this.isLeft(char)) {
            if (this.filtered.length === 0) return;
            if (this.cursor > 0) {
                this.cursor--;
            } else {
                // Wrap to end?
                this.cursor = this.filtered.length - 1;
            }
            this.adjustScroll();
            this.render(false);
            return;
        }

        if (this.isRight(char)) {
            if (this.filtered.length === 0) return;
            if (this.cursor < this.filtered.length - 1) {
                this.cursor++;
            } else {
                // Wrap to start?
                this.cursor = 0;
            }
            this.adjustScroll();
            this.render(false);
            return;
        }

        // Enter
        if (char === '\r' || char === '\n') {
            if (this.filtered.length > 0) {
                this.submit(this.filtered[this.cursor].char);
            }
            return;
        }

        // Backspace
        if (char === '\u0008' || char === '\x7f') {
            if (this.search.length > 0) {
                this.search = this.search.slice(0, -1);
                this.updateFilter();
                this.render(false);
            }
            return;
        }

        // Typing
        if (!/^[\x00-\x1F]/.test(char) && !char.startsWith('\x1b')) {
            this.search += char;
            this.updateFilter();
            this.render(false);
        }
    }

    protected handleMouse(event: MouseEvent): void {
        if (event.action === 'scroll' && this.filtered.length > 0) {
            if (event.scroll === 'up') {
                // Left / Previous
                if (this.cursor > 0) {
                    this.cursor--;
                } else {
                    this.cursor = this.filtered.length - 1;
                }
            } else {
                // Right / Next
                if (this.cursor < this.filtered.length - 1) {
                    this.cursor++;
                } else {
                    this.cursor = 0;
                }
            }
            this.adjustScroll();
            this.render(false);
        }
    }

    private adjustScroll() {
        const cursorRow = Math.floor(this.cursor / this.cols);

        if (cursorRow < this.scrollTop) {
            this.scrollTop = cursorRow;
        } else if (cursorRow >= this.scrollTop + this.pageSize) {
            this.scrollTop = cursorRow - this.pageSize + 1;
        }
    }
}
