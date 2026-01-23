import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { symbols } from '../symbols';
import { SortOptions, MouseEvent } from '../types';

export class SortPrompt extends Prompt<string[], SortOptions> {
    private items: string[];
    private selectedIndex: number = 0;
    private grabbedIndex: number | null = null;
    private scrollTop: number = 0;
    private readonly pageSize: number = 10;

    constructor(options: SortOptions) {
        super(options);
        this.items = [...options.items];
    }

    protected render(firstRender: boolean) {
        // Adjust Scroll Top
        if (this.selectedIndex < this.scrollTop) {
            this.scrollTop = this.selectedIndex;
        } else if (this.selectedIndex >= this.scrollTop + this.pageSize) {
            this.scrollTop = this.selectedIndex - this.pageSize + 1;
        }
        
        // Ensure valid scroll (handle list shrinking?) - list doesn't shrink here but good practice
        this.scrollTop = Math.max(0, Math.min(this.scrollTop, this.items.length - this.pageSize));
        if (this.scrollTop < 0) this.scrollTop = 0;

        let output = '';
        
        // Header
        output += `${theme.success}?${ANSI.RESET} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET} ${theme.muted}(Press <space> to grab, arrows to move, <enter> to confirm)${ANSI.RESET}\n`;

        const visibleItems = this.items.slice(this.scrollTop, this.scrollTop + this.pageSize);

        visibleItems.forEach((item, index) => {
            const actualIndex = this.scrollTop + index;
            if (index > 0) output += '\n';

            const isSelected = actualIndex === this.selectedIndex;
            const isGrabbed = actualIndex === this.grabbedIndex;

            // Pointer
            let prefix = '  ';
            if (isSelected) {
                if (isGrabbed) {
                    prefix = `${theme.main}${symbols.pointer}${symbols.pointer} `; // Double pointer for grabbed?
                } else {
                    prefix = `${theme.main}${symbols.pointer} `;
                }
            } else if (isGrabbed) {
                // Should not happen if we move grabbed item with cursor
                // But if logic differs, maybe.
            }

            // Item Content
            let content = item;
            if (isGrabbed) {
                content = `${ANSI.BOLD}${theme.main}${content}${ANSI.RESET}`; 
            } else if (isSelected) {
                content = `${theme.main}${content}${ANSI.RESET}`;
            }

            // Index indicator? Maybe not needed, minimalist.
            
            output += `${prefix}${content}`;
        });

        this.renderFrame(output);
    }

    protected handleInput(char: string) {
        // Enter
        if (char === '\r' || char === '\n') {
            this.submit(this.items);
            return;
        }

        // Space (Grab/Drop)
        if (char === ' ') {
            if (this.grabbedIndex === null) {
                this.grabbedIndex = this.selectedIndex;
            } else {
                this.grabbedIndex = null;
            }
            this.render(false);
            return;
        }

        // Up
        if (this.isUp(char)) {
            if (this.grabbedIndex !== null) {
                // Move item up
                if (this.selectedIndex > 0) {
                    const newIndex = this.selectedIndex - 1;
                    this.swap(this.selectedIndex, newIndex);
                    this.selectedIndex = newIndex;
                    this.grabbedIndex = newIndex;
                }
            } else {
                // Move cursor up
                this.selectedIndex = this.selectedIndex > 0 ? this.selectedIndex - 1 : this.items.length - 1;
            }
            this.render(false);
            return;
        }

        // Down
        if (this.isDown(char)) {
            if (this.grabbedIndex !== null) {
                // Move item down
                if (this.selectedIndex < this.items.length - 1) {
                    const newIndex = this.selectedIndex + 1;
                    this.swap(this.selectedIndex, newIndex);
                    this.selectedIndex = newIndex;
                    this.grabbedIndex = newIndex;
                }
            } else {
                 // Move cursor down
                 this.selectedIndex = this.selectedIndex < this.items.length - 1 ? this.selectedIndex + 1 : 0;
            }
            this.render(false);
            return;
        }
    }

    private swap(i: number, j: number) {
        [this.items[i], this.items[j]] = [this.items[j], this.items[i]];
    }
    
    // Mouse support? 
    // Drag and drop is hard with just clicks/scroll. 
    // Maybe click to grab, scroll to move?
    protected handleMouse(event: MouseEvent) {
        // Simple scroll support for navigation
         if (event.action === 'scroll') {
            if (event.scroll === 'up') {
                if (this.grabbedIndex !== null) {
                     if (this.selectedIndex > 0) {
                        const newIndex = this.selectedIndex - 1;
                        this.swap(this.selectedIndex, newIndex);
                        this.selectedIndex = newIndex;
                        this.grabbedIndex = newIndex;
                    }
                } else {
                    this.selectedIndex = this.selectedIndex > 0 ? this.selectedIndex - 1 : this.items.length - 1;
                }
                this.render(false);
            } else if (event.scroll === 'down') {
                if (this.grabbedIndex !== null) {
                    if (this.selectedIndex < this.items.length - 1) {
                        const newIndex = this.selectedIndex + 1;
                        this.swap(this.selectedIndex, newIndex);
                        this.selectedIndex = newIndex;
                        this.grabbedIndex = newIndex;
                    }
                } else {
                    this.selectedIndex = this.selectedIndex < this.items.length - 1 ? this.selectedIndex + 1 : 0;
                }
                this.render(false);
            }
        }
    }
}
