import { BreadcrumbPrompt } from './breadcrumb';
import { BreadcrumbOptions } from '../types';
import { theme } from '../theme';
import { ANSI } from '../ansi';
import { symbols } from '../symbols';
import { fuzzyMatch } from '../utils';
import * as path from 'path';

export class BreadcrumbSearchPrompt extends BreadcrumbPrompt {
    private isSearchMode: boolean = false;
    private searchBuffer: string = '';
    private filteredEntries: any[] = [];
    private searchCursor: number = 0;

    constructor(options: BreadcrumbOptions) {
        super(options);
    }

    protected handleInput(char: string, key: Buffer) {
        if (this.isLoading) return;

        // Toggle Search Mode or Type
        if (!this.isSearchMode) {
             // If typing a regular char, enter search mode
             if (char.length === 1 && !/^[\x00-\x1F]/.test(char) && !char.startsWith('\x1b')) {
                 this.isSearchMode = true;
                 this.searchBuffer = char;
                 this.updateSearchResults();
                 this.render(false);
                 return;
             }
             // Otherwise use default navigation
             super.handleInput(char, key);
             return;
        }

        // --- In Search Mode ---

        // Esc: Exit search mode
        if (char === '\x1b') {
            this.isSearchMode = false;
            this.searchBuffer = '';
            this.render(false);
            return;
        }

        // Backspace
        if (char === '\u0008' || char === '\x7f') {
            if (this.searchBuffer.length > 0) {
                this.searchBuffer = this.searchBuffer.slice(0, -1);
                if (this.searchBuffer.length === 0) {
                    this.isSearchMode = false;
                } else {
                    this.updateSearchResults();
                }
                this.render(false);
            } else {
                this.isSearchMode = false;
                this.render(false);
            }
            return;
        }

        // Enter
        if (char === '\r' || char === '\n') {
            if (this.filteredEntries.length === 0) return;
            
            const entry = this.filteredEntries[this.searchCursor];
            if (entry.isDirectory) {
                // Drill down
                // We need to match the cursor in the real currentEntries list to call drillDown?
                // Or just implement custom drillDown logic here.
                // Because `drillDown` uses `this.cursor` and `this.currentEntries`.
                
                // Hack: Find index in currentEntries
                const realIndex = this.currentEntries.findIndex(e => e.name === entry.name);
                if (realIndex !== -1) {
                    this.cursor = realIndex;
                    this.drillDown().then(() => {
                        this.isSearchMode = false;
                        this.searchBuffer = '';
                    });
                }
            } else {
                const fullPath = path.join(this.currentPath, entry.name);
                this.submit(fullPath);
            }
            return;
        }

        // Navigation (Up/Down)
        if (this.isUp(char)) {
            if (this.searchCursor > 0) {
                this.searchCursor--;
            } else {
                this.searchCursor = Math.max(0, this.filteredEntries.length - 1);
            }
            this.render(false);
            return;
        }

        if (this.isDown(char)) {
            if (this.searchCursor < this.filteredEntries.length - 1) {
                this.searchCursor++;
            } else {
                this.searchCursor = 0;
            }
            this.render(false);
            return;
        }

        // Typing
        if (char.length === 1 && !/^[\x00-\x1F]/.test(char) && !char.startsWith('\x1b')) {
            this.searchBuffer += char;
            this.updateSearchResults();
            this.render(false);
        }
    }

    private updateSearchResults() {
        if (!this.searchBuffer) {
            this.filteredEntries = [];
            return;
        }

        const results = this.currentEntries.map(entry => {
            const match = fuzzyMatch(this.searchBuffer, entry.name);
            return { entry, match };
        }).filter(item => item.match !== null)
          .sort((a, b) => b.match!.score - a.match!.score);
          
        this.filteredEntries = results.map(r => ({
            ...r.entry,
            _match: r.match
        }));
        
        this.searchCursor = 0;
    }

    protected render(firstRender: boolean) {
        if (!this.isSearchMode) {
            super.render(firstRender);
            return;
        }

        // Render Search Overlay
        const width = this.stdout.columns || 80;
        let output = '';

        // Breadcrumb + Search Bar
        const relative = path.relative(this.root, this.currentPath);
        // ... (Truncation logic omitted for brevity, simplified version)
        const pathStr = relative || path.basename(this.root);
        
        const prefix = `${theme.success}?${ANSI.RESET} ${theme.title}${this.options.message}${ANSI.RESET} `;
        output += `${prefix}${theme.muted}${pathStr}/${ANSI.RESET} ${ANSI.FG_YELLOW}(Search: ${this.searchBuffer})${ANSI.RESET}\n`;

        if (this.filteredEntries.length === 0) {
             output += `  ${theme.muted}No results found${ANSI.RESET}`;
        } else {
            const pageSize = this.pageSize;
            let start = 0;
             // Adjust Scroll Top for Search
             // We reuse `scrollTop`? No, let's just calc dynamically or use local var?
             // Since `render` is called frequently, let's just show top N for now or simple scroll logic
             // To keep it simple, we can center the cursor or just standard scroll
             
             // Reuse scrollTop logic but locally
             let localScrollTop = 0;
             if (this.searchCursor < localScrollTop) {
                 localScrollTop = this.searchCursor;
             } else if (this.searchCursor >= localScrollTop + pageSize) {
                 localScrollTop = this.searchCursor - pageSize + 1;
             }
             // But wait, `localScrollTop` isn't persisted across renders.
             // We should persist it or derive it from searchCursor assuming we want to keep cursor in view.
             // Since we re-render whole frame, we can just compute "window" around searchCursor.
             
             // Simplest: Always show cursor in view. 
             // We can't really do smooth scrolling without state. 
             // Let's assume we show a window where cursor is roughly middle or just clamped.
             // Actually, the base class persists `scrollTop`. We can use a separate property if we want,
             // but `this.scrollTop` is protected. We can use it for search mode too?
             // But switching back and forth might mess it up.
             // Let's rely on calculating start index.
             
             const half = Math.floor(pageSize / 2);
             start = Math.max(0, this.searchCursor - half);
             if (start + pageSize > this.filteredEntries.length) {
                 start = Math.max(0, this.filteredEntries.length - pageSize);
             }
             
             const visible = this.filteredEntries.slice(start, start + pageSize);

             visible.forEach((entry, index) => {
                 const actualIndex = start + index;
                 const isSelected = actualIndex === this.searchCursor;
                 const icon = entry.isDirectory ? '📂' : '📄';
                 
                 // Highlight match
                 const title = this.highlight(entry.name, entry._match.indices, isSelected);

                 let line = '';
                 if (isSelected) {
                     line += `${theme.main}${symbols.pointer} ${icon} ${title}${ANSI.RESET}`;
                 } else {
                     line += `  ${icon} ${title}`;
                 }
                 
                 if (index > 0 || index === 0) output += line;
                 if (index < visible.length - 1) output += '\n';
             });
        }
        
        this.renderFrame(output);
    }
    
    private highlight(text: string, indices: number[], isSelected: boolean): string {
        let output = '';
        const indexSet = new Set(indices);
        for (let i = 0; i < text.length; i++) {
            if (indexSet.has(i)) {
                if (isSelected) {
                     output += `${ANSI.BOLD}${ANSI.FG_WHITE}${text[i]}${theme.main}`; 
                } else {
                     output += `${ANSI.BOLD}${ANSI.FG_CYAN}${text[i]}${ANSI.RESET}`;
                }
            } else {
                output += text[i];
            }
        }
        return output;
    }
}
