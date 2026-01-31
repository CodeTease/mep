import { Prompt } from '../base';
import { MillerOptions, TreeNode, MouseEvent } from '../types';
import { theme } from '../theme';
import { ANSI } from '../ansi';
import { symbols } from '../symbols';
import { stringWidth, stripAnsi } from '../utils';

export class MillerPrompt<V> extends Prompt<V[], MillerOptions<V>> {
    private selections: number[] = [];
    private activeCol: number = 0;
    private scrollTops: number[] = []; // Scroll position for each column
    
    // Layout
    private colWidth: number = 0;
    private visibleCols: number = 3;

    constructor(options: MillerOptions<V>) {
        super(options);
        
        this.selections = [0];
        this.scrollTops = [0];
        
        // TODO: Map initial values to selections if provided
        
        this.calculateLayout();
    }
    
    private calculateLayout() {
        const termWidth = process.stdout.columns || 80;
        // We aim for 3 columns? Or based on width?
        // Minimum width per column ~ 20?
        this.visibleCols = Math.floor(termWidth / 20);
        if (this.visibleCols < 1) this.visibleCols = 1;
        if (this.visibleCols > 4) this.visibleCols = 4; // Cap at 4
        
        this.colWidth = Math.floor((termWidth - 4) / this.visibleCols); // -4 for margins
    }
    
    private getColumnData(depth: number): TreeNode<V>[] | undefined {
        let current = this.options.data;
        for (let i = 0; i < depth; i++) {
            const sel = this.selections[i];
            if (current[sel] && current[sel].children) {
                current = current[sel].children!;
            } else {
                return undefined;
            }
        }
        return current;
    }

    protected render(_firstRender: boolean) {
        let output = '';
        
        output += `${theme.success}?${ANSI.RESET} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET}\n`;
        
        let startCol = 0;
        if (this.activeCol >= this.visibleCols) {
            startCol = this.activeCol - this.visibleCols + 1;
        }
        
        // Construct columns content
        const columnsToRender: string[][] = [];
        
        for (let c = startCol; c < startCol + this.visibleCols; c++) {
            const data = this.getColumnData(c);
            if (!data) break;
            
            const rows: string[] = [];
            const selectedIdx = this.selections[c] ?? -1;
            const isFocusedCol = c === this.activeCol;
            
            // Scroll handling
            const pageSize = 10; // Fixed height for now
            if (!this.scrollTops[c]) this.scrollTops[c] = 0;
            
            if (selectedIdx !== -1) {
                if (selectedIdx < this.scrollTops[c]) {
                    this.scrollTops[c] = selectedIdx;
                } else if (selectedIdx >= this.scrollTops[c] + pageSize) {
                    this.scrollTops[c] = selectedIdx - pageSize + 1;
                }
            }
            
            // Render rows
            const start = this.scrollTops[c];
            const end = Math.min(data.length, start + pageSize);
            
            for (let i = start; i < end; i++) {
                const item = data[i];
                const isSelected = i === selectedIdx;
                const isFocused = isSelected && isFocusedCol;
                
                let prefix = ' ';
                if (isSelected) {
                    prefix = isFocused ? `${theme.main}${symbols.pointer}${ANSI.RESET}` : `${theme.muted}${symbols.pointer}${ANSI.RESET}`;
                }
                
                let title = item.title;
                // Truncate
                if (stringWidth(title) > this.colWidth - 4) {
                    title = title.slice(0, this.colWidth - 5) + '…';
                }
                
                let line = `${prefix} ${isSelected && isFocused ? theme.main : ''}${title}${ANSI.RESET}`;
                
                // Add arrow if children exist
                if (item.children && item.children.length > 0) {
                     const pad = this.colWidth - stringWidth(stripAnsi(line)) - 2;
                     line += ' '.repeat(Math.max(0, pad)) + `${theme.muted}>${ANSI.RESET}`;
                }
                
                rows.push(line);
            }
            
            // Pad column to pageSize
            while (rows.length < pageSize) {
                rows.push('');
            }
            
            columnsToRender.push(rows);
        }
        
        // Combine columns side by side
        const rowCount = 10;
        for (let r = 0; r < rowCount; r++) {
            let line = '';
            for (let c = 0; c < columnsToRender.length; c++) {
                let cell = columnsToRender[c][r] || '';
                // Pad cell
                const len = stringWidth(stripAnsi(cell));
                const pad = this.colWidth - len;
                cell += ' '.repeat(Math.max(0, pad));
                
                line += cell;
                
                // Separator
                if (c < columnsToRender.length - 1) {
                    line += `${theme.muted}│${ANSI.RESET} `;
                }
            }
            output += line + '\n';
        }

        // Breadcrumbs / Status
        const pathTitles = [];
        for (let i = 0; i <= this.activeCol; i++) {
            const data = this.getColumnData(i);
            if (data && typeof this.selections[i] === 'number') {
                pathTitles.push(data[this.selections[i]].title);
            }
        }
        output += `${theme.muted}Path: ${pathTitles.join(' / ')}${ANSI.RESET}`;

        this.renderFrame(output);
    }
    
    protected handleInput(char: string) {
        const currentData = this.getColumnData(this.activeCol);
        if (!currentData) return; // Should not happen
        
        // Enter
        if (char === '\r' || char === '\n') {
            // Collect values
            const values: V[] = [];
            for(let i=0; i<=this.activeCol; i++) {
                 const d = this.getColumnData(i);
                 if(d) values.push(d[this.selections[i]].value);
            }
            this.submit(values);
            return;
        }

        if (this.isUp(char)) {
            if (this.selections[this.activeCol] > 0) {
                this.selections[this.activeCol]--;
                // Reset subsequent columns
                this.selections = this.selections.slice(0, this.activeCol + 1);
            } else {
                 this.selections[this.activeCol] = currentData.length - 1;
                 this.selections = this.selections.slice(0, this.activeCol + 1);
            }
            this.render(false);
            return;
        }
        
        if (this.isDown(char)) {
             if (this.selections[this.activeCol] < currentData.length - 1) {
                this.selections[this.activeCol]++;
                this.selections = this.selections.slice(0, this.activeCol + 1);
             } else {
                 this.selections[this.activeCol] = 0;
                 this.selections = this.selections.slice(0, this.activeCol + 1);
             }
             this.render(false);
             return;
        }
        
        if (this.isRight(char)) {
            // Expand
            const idx = this.selections[this.activeCol];
            const item = currentData[idx];
            if (item.children && item.children.length > 0) {
                this.activeCol++;
                this.selections[this.activeCol] = 0;
                this.render(false);
            }
            return;
        }
        
        if (this.isLeft(char)) {
            if (this.activeCol > 0) {
                this.activeCol--;
                this.render(false);
            }
            return;
        }
    }

    protected handleMouse(event: MouseEvent) {
        if (event.action === 'scroll') {
            const currentData = this.getColumnData(this.activeCol);
            if (!currentData || currentData.length === 0) return;

            if (event.scroll === 'up') {
                if (this.selections[this.activeCol] > 0) {
                    this.selections[this.activeCol]--;
                } else {
                    this.selections[this.activeCol] = currentData.length - 1;
                }
            } else if (event.scroll === 'down') {
                if (this.selections[this.activeCol] < currentData.length - 1) {
                    this.selections[this.activeCol]++;
                } else {
                    this.selections[this.activeCol] = 0;
                }
            }

            // Reset subsequent columns
            this.selections = this.selections.slice(0, this.activeCol + 1);
            this.render(false);
        }
    }
}
