import { Prompt } from '../base';
import { KanbanOptions, KanbanItem, KanbanColumn, MouseEvent } from '../types';
import { ANSI } from '../ansi';
import { stringWidth } from '../utils';

export class KanbanPrompt<V extends KanbanItem> extends Prompt<Record<string, V[]>, KanbanOptions<V>> {
    private columns: KanbanColumn<V>[];
    private activeCol: number = 0;
    private activeRow: number = 0;
    private grabbed: boolean = false;
    private scrollStates: number[];

    constructor(options: KanbanOptions<V>) {
        super(options);
        // Deep copy columns to avoid mutating original options during drag/drop
        this.columns = JSON.parse(JSON.stringify(options.columns));
        this.scrollStates = new Array(this.columns.length).fill(0);
    }

    protected render(firstRender: boolean): void {
        const { columns } = this.stdout; // terminal width
        const colCount = this.columns.length;
        const colWidth = Math.floor(columns / colCount);
        
        let output = '';

        // Render Title
        output += `${ANSI.FG_CYAN}${ANSI.BOLD}? ${this.options.message}${ANSI.RESET}\n`;
        if (this.grabbed) {
             output += `${ANSI.FG_YELLOW}(Grabbed) Move with arrows, Space to Drop${ANSI.RESET}\n`;
        } else {
             output += `${ANSI.FG_GRAY}(Normal) Space to Grab, Arrows to Navigate, Enter to Submit${ANSI.RESET}\n`;
        }

        // Render Headers
        const headers = this.columns.map((col, i) => {
            const isSelected = i === this.activeCol;
            const title = this.truncate(col.title, colWidth - 4);
            const style = isSelected ? `${ANSI.FG_BLUE}${ANSI.BOLD}` : ANSI.BOLD;
            return this.padCenter(title, colWidth, style);
        });
        output += headers.join('') + '\n';
        
        // Render Separator
        output += ANSI.FG_GRAY + '─'.repeat(columns) + ANSI.RESET + '\n';

        // Render Rows
        const viewportHeight = 10;
        
        for (let r = 0; r < viewportHeight; r++) {
            const rowLine = this.columns.map((col, cIndex) => {
                const scrollTop = this.scrollStates[cIndex];
                const itemIndex = r + scrollTop;
                const item = col.items[itemIndex];

                let content = '';
                if (item) {
                    const isCursor = cIndex === this.activeCol && itemIndex === this.activeRow;
                    let prefix = ' ';
                    let suffix = ' ';
                    let style = '';

                    if (isCursor) {
                         if (this.grabbed) {
                             style = ANSI.BG_YELLOW + ANSI.FG_BLACK;
                             prefix = '>';
                         } else {
                             style = ANSI.FG_CYAN + ANSI.BOLD;
                             prefix = '>';
                         }
                    }

                    const title = this.truncate(item.title, colWidth - 4);
                    content = `${prefix} ${title}${suffix}`;
                    content = content.padEnd(colWidth);
                    
                    const plain = `${prefix} ${title}${suffix}`.padEnd(colWidth);

                    if (style) {
                        content = style + plain + ANSI.RESET;
                    } else {
                         content = plain;
                    }

                } else {
                    // Empty slot
                    content = ' '.repeat(colWidth);
                }
                return content;
            }).join('');
            
            output += rowLine + '\n';
        }

        this.renderFrame(output);
    }

    private padCenter(str: string, width: number, style: string = ''): string {
        const visibleLen = stringWidth(str);
        if (visibleLen >= width) return style + str + ANSI.RESET;
        const left = Math.floor((width - visibleLen) / 2);
        const right = width - visibleLen - left;
        return ' '.repeat(left) + style + str + ANSI.RESET + ' '.repeat(right);
    }

    protected handleMouse(event: MouseEvent): void {
        if (event.action === 'scroll') {
            if (this.grabbed) {
                // Grabbed: Scroll moves Left/Right
                if (event.scroll === 'up') {
                    // Up/Left
                    if (this.activeCol > 0) {
                        this.moveItemHorizontal(-1);
                        this.activeCol--;
                        this.clampRow();
                        this.ensureVisible();
                    }
                } else if (event.scroll === 'down') {
                    // Down/Right
                    if (this.activeCol < this.columns.length - 1) {
                        this.moveItemHorizontal(1);
                        this.activeCol++;
                        this.clampRow();
                        this.ensureVisible();
                    }
                }
            } else {
                // Normal: Scroll moves Up/Down
                if (event.scroll === 'up') {
                     if (this.activeRow > 0) {
                        this.activeRow--;
                        this.ensureVisible();
                    }
                } else if (event.scroll === 'down') {
                     const colLen = this.columns[this.activeCol].items.length;
                     if (this.activeRow < colLen - 1) {
                        this.activeRow++;
                        this.ensureVisible();
                    }
                }
            }
            this.render(false);
        }
    }

    protected handleInput(char: string, key: Buffer): void {
        if (char === '\r' || char === '\n') { // Enter
            const result: Record<string, V[]> = {};
            this.columns.forEach(c => {
                result[c.id] = c.items;
            });
            this.submit(result);
            return;
        }

        if (char === ' ') { // Space
            this.grabbed = !this.grabbed;
            this.render(false);
            return;
        }

        if (this.isLeft(char)) {
            if (this.activeCol > 0) {
                if (this.grabbed) {
                    this.moveItemHorizontal(-1);
                }
                this.activeCol--;
                this.clampRow();
                this.ensureVisible();
            }
        } else if (this.isRight(char)) {
            if (this.activeCol < this.columns.length - 1) {
                 if (this.grabbed) {
                    this.moveItemHorizontal(1);
                }
                this.activeCol++;
                this.clampRow();
                this.ensureVisible();
            }
        } else if (this.isUp(char)) {
            if (this.activeRow > 0) {
                if (this.grabbed) {
                    // Swap with prev
                    const col = this.columns[this.activeCol];
                    const temp = col.items[this.activeRow];
                    col.items[this.activeRow] = col.items[this.activeRow - 1];
                    col.items[this.activeRow - 1] = temp;
                }
                this.activeRow--;
                this.ensureVisible();
            }
        } else if (this.isDown(char)) {
            const colLen = this.columns[this.activeCol].items.length;
            if (this.activeRow < colLen - 1) {
                 if (this.grabbed) {
                    // Swap with next
                    const col = this.columns[this.activeCol];
                    const temp = col.items[this.activeRow];
                    col.items[this.activeRow] = col.items[this.activeRow + 1];
                    col.items[this.activeRow + 1] = temp;
                }
                this.activeRow++;
                this.ensureVisible();
            }
        }

        this.render(false);
    }

    private moveItemHorizontal(direction: number) {
        const sourceCol = this.columns[this.activeCol];
        const targetCol = this.columns[this.activeCol + direction];
        const item = sourceCol.items.splice(this.activeRow, 1)[0];
        
        let targetIndex = this.activeRow;
        if (targetIndex > targetCol.items.length) {
            targetIndex = targetCol.items.length;
        }
        
        targetCol.items.splice(targetIndex, 0, item);

        this.activeRow = targetIndex;
    }

    private clampRow() {
        const len = this.columns[this.activeCol].items.length;
        if (len === 0) {
            this.activeRow = 0;
        } else if (this.activeRow >= len) {
            this.activeRow = len - 1;
        }
    }

    private ensureVisible() {
        const scrollTop = this.scrollStates[this.activeCol];
        const viewportHeight = 10;
        
        if (this.activeRow < scrollTop) {
            this.scrollStates[this.activeCol] = this.activeRow;
        } else if (this.activeRow >= scrollTop + viewportHeight) {
            this.scrollStates[this.activeCol] = this.activeRow - viewportHeight + 1;
        }
    }
}
