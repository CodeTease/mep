import { Prompt } from '../base';
import { BreadcrumbOptions, MouseEvent } from '../types';
import { ANSI } from '../ansi';
import { theme } from '../theme';
import { symbols } from '../symbols';
import * as fs from 'fs/promises';
import * as path from 'path';

interface StackItem {
    path: string;
    cursor: number;
    scrollTop: number;
}

interface DirEntry {
    name: string;
    isDirectory: boolean;
}

export class BreadcrumbPrompt extends Prompt<string, BreadcrumbOptions> {
    private stack: StackItem[] = [];
    private currentEntries: DirEntry[] = [];
    private cursor: number = 0;
    private scrollTop: number = 0;
    private root: string;
    private currentPath: string;
    private separator: string;
    private showHidden: boolean;
    private isLoading: boolean = false;
    private error: string | null = null;
    private readonly pageSize: number = 10;

    constructor(options: BreadcrumbOptions) {
        super(options);
        this.root = path.resolve(options.root || process.cwd());
        this.currentPath = this.root;
        this.separator = options.separator || ' › ';
        this.showHidden = options.showHidden || false;
        
        this.loadDirectory(this.currentPath);
    }

    private async loadDirectory(dir: string) {
        this.isLoading = true;
        this.error = null;
        this.render(false); 

        try {
            await fs.access(dir);

            const dirents = await fs.readdir(dir, { withFileTypes: true });
            let entries = dirents.map(d => ({
                name: d.name,
                isDirectory: d.isDirectory()
            }));

            if (!this.showHidden) {
                entries = entries.filter(e => !e.name.startsWith('.'));
            }

            entries.sort((a, b) => {
                if (a.isDirectory === b.isDirectory) {
                    return a.name.localeCompare(b.name);
                }
                return a.isDirectory ? -1 : 1;
            });

            this.currentEntries = entries;
            
            if (this.currentEntries.length === 0) {
                this.cursor = 0;
            } else if (this.cursor >= this.currentEntries.length) {
                this.cursor = this.currentEntries.length - 1;
            }
        } catch (err: any) {
            this.error = err.message || 'Error reading directory';
            this.currentEntries = [];
        } finally {
            this.isLoading = false;
            this.render(false);
        }
    }

    private async drillDown() {
        const entry = this.currentEntries[this.cursor];
        if (!entry || !entry.isDirectory) return;

        const nextPath = path.join(this.currentPath, entry.name);
        
        this.stack.push({
            path: this.currentPath,
            cursor: this.cursor,
            scrollTop: this.scrollTop
        });

        this.currentPath = nextPath;
        this.cursor = 0;
        this.scrollTop = 0;
        
        await this.loadDirectory(nextPath);
    }

    private async goUp() {
        if (this.stack.length === 0) return;

        const prevState = this.stack.pop();
        if (prevState) {
            this.currentPath = prevState.path;
            this.cursor = prevState.cursor;
            this.scrollTop = prevState.scrollTop;
            
            await this.loadDirectory(this.currentPath);
        }
    }

    protected render(firstRender: boolean): void {
        const width = this.stdout.columns || 80;
        let output = '';

        // --- Breadcrumb Line Construction ---
        const relative = path.relative(this.root, this.currentPath);
        const parts = relative ? relative.split(path.sep) : [];
        const rootName = path.basename(this.root);
        const segments = [rootName, ...parts];

        // Calculate available space for path
        // Prefix: "? Message: "
        const prefix = `${theme.success}?${ANSI.RESET} ${theme.title}${this.options.message}${ANSI.RESET} `;
        const prefixWidth = this.stripAnsi(prefix).length;
        const availableWidth = Math.max(20, width - prefixWidth - 5); // Reserve 5 chars buffer

        let breadcrumbStr = segments.join(this.separator);

        if (breadcrumbStr.length > availableWidth) {
            // Truncate logic: Keep root and tail segments that fit
            // e.g., root > ... > folder > subfolder
            let suffix = segments[segments.length - 1];
            for (let i = segments.length - 2; i >= 1; i--) { // Stop before root (index 0)
                const next = segments[i] + this.separator + suffix;
                if (next.length + 4 > availableWidth) break; // +4 for "... "
                suffix = next;
            }
            breadcrumbStr = `${segments[0]}${this.separator}...${this.separator}${suffix}`;
            
            // If even that is too long (extreme case), just truncate tail
             if (breadcrumbStr.length > availableWidth) {
                 breadcrumbStr = '...' + breadcrumbStr.slice(-(availableWidth - 3));
             }
        }
        
        output += `${prefix}${breadcrumbStr}\n`;

        // --- Content / List ---
        if (this.isLoading) {
            output += `  ${theme.muted}Loading...${ANSI.RESET}`;
        } else if (this.error) {
            output += `  ${theme.error}${this.error}${ANSI.RESET}`;
        } else if (this.currentEntries.length === 0) {
             output += `  ${theme.muted}(Empty directory)${ANSI.RESET}\n  ${theme.muted}(Backspace to go back)${ANSI.RESET}`;
        } else {
            // Adjust Scroll Top
            if (this.cursor < this.scrollTop) {
                this.scrollTop = this.cursor;
            } else if (this.cursor >= this.scrollTop + this.pageSize) {
                this.scrollTop = this.cursor - this.pageSize + 1;
            }
            // Sanity check
             if (this.scrollTop > this.currentEntries.length - 1) {
                this.scrollTop = Math.max(0, this.currentEntries.length - this.pageSize);
            }

            const visibleEntries = this.currentEntries.slice(this.scrollTop, this.scrollTop + this.pageSize);

            visibleEntries.forEach((entry, index) => {
                const absoluteIndex = this.scrollTop + index;
                const isSelected = absoluteIndex === this.cursor;
                const icon = entry.isDirectory ? '📂' : '📄';
                
                let line = '';
                if (isSelected) {
                    line += `${theme.main}${symbols.pointer} ${icon} ${entry.name}${ANSI.RESET}`;
                } else {
                    line += `  ${icon} ${entry.name}`;
                }
                
                if (index > 0 || index === 0) output += line;
                if (index < visibleEntries.length - 1) output += '\n';
            });
            
            // Add a hint about navigation if plenty of space? 
            // Optional: output += `\n${theme.muted}(Use Arrow Keys, Enter to Select, Backspace to Up)${ANSI.RESET}`;
        }

        this.renderFrame(output);
    }

    protected handleInput(char: string, key: Buffer): void {
        if (this.isLoading) return;

        // Enter
        if (char === '\r' || char === '\n') {
            if (this.currentEntries.length === 0) return;
            
            const entry = this.currentEntries[this.cursor];
            if (entry.isDirectory) {
                this.drillDown();
            } else {
                const fullPath = path.join(this.currentPath, entry.name);
                this.submit(fullPath);
            }
            return;
        }

        // Backspace or Left Arrow
        if (char === '\x7f' || char === '\x08' || this.isLeft(char)) {
            this.goUp();
            return;
        }

        // Right Arrow
        if (this.isRight(char)) {
            const entry = this.currentEntries[this.cursor];
            if (entry && entry.isDirectory) {
                this.drillDown();
            }
            return;
        }

        // Tab (Next)
        if (char === '\t') {
            if (this.currentEntries.length === 0) return;
            this.cursor = (this.cursor + 1) % this.currentEntries.length;
            this.render(false);
            return;
        }

        // Shift+Tab (Prev)
        if (char === '\x1b[Z') {
            if (this.currentEntries.length === 0) return;
            this.cursor = (this.cursor - 1 + this.currentEntries.length) % this.currentEntries.length;
            this.render(false);
            return;
        }

        // Up
        if (this.isUp(char)) {
            if (this.cursor > 0) {
                this.cursor--;
                this.render(false);
            } else if (this.currentEntries.length > 0) {
                // Cycle to bottom?
                this.cursor = this.currentEntries.length - 1;
                this.render(false);
            }
            return;
        }

        // Down
        if (this.isDown(char)) {
            if (this.cursor < this.currentEntries.length - 1) {
                this.cursor++;
                this.render(false);
            } else if (this.currentEntries.length > 0) {
                // Cycle to top?
                this.cursor = 0;
                this.render(false);
            }
            return;
        }

        // Page Up
        if (char === '\x1b[5~') {
            this.cursor = Math.max(0, this.cursor - this.pageSize);
            this.render(false);
            return;
        }

        // Page Down
        if (char === '\x1b[6~') {
            this.cursor = Math.min(this.currentEntries.length - 1, this.cursor + this.pageSize);
            this.render(false);
            return;
        }
    }

    protected handleMouse(_event: MouseEvent): void {
        // Scroll up and down
        if (this.isLoading) return;

        if (_event.action === 'scroll') {
            if (_event.scroll === 'up') {
                if (this.cursor > 0) {
                    this.cursor--;
                    this.render(false);
                }
            } else if (_event.scroll === 'down') {
                if (this.cursor < this.currentEntries.length - 1) {
                    this.cursor++;
                    this.render(false);
                }
            }
        }
    }
}
