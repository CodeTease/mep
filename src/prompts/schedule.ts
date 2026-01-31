import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { ScheduleOptions, ScheduleTask, MouseEvent } from '../types';
import { stringWidth } from '../utils';

export class SchedulePrompt extends Prompt<ScheduleTask[], ScheduleOptions> {
    private cursor: number = 0;
    private tasks: ScheduleTask[];
    private scrollTop: number = 0;
    private readonly pageSize: number = 10;
    
    // Viewport State
    private viewStartDate: number;
    private msPerChar: number; // Zoom level

    // Layout
    private nameColWidth: number = 20;

    constructor(options: ScheduleOptions) {
        super(options);
        // Deep clone to avoid mutating original data before submission
        this.tasks = options.data.map(t => ({
            ...t,
            start: new Date(t.start),
            end: new Date(t.end)
        }));

        // Initial Calculations
        const minDate = Math.min(...this.tasks.map(t => t.start.getTime()));
        const maxDate = Math.max(...this.tasks.map(t => t.end.getTime()));
        
        // Default Zoom: Fit the whole range into ~60 chars
        const range = maxDate - minDate || 86400000; // default 1 day if 0
        this.msPerChar = range / 60; 
        
        // Start view slightly before the earliest task
        this.viewStartDate = minDate - (this.msPerChar * 5); 
    }

    private get maxNameWidth(): number {
        return Math.max(...this.tasks.map(t => stringWidth(t.name))) + 2;
    }

    protected render(firstRender: boolean) {
        // Dynamic Layout
        const termWidth = this.stdout.columns || 80;
        this.nameColWidth = Math.min(Math.max(this.maxNameWidth, 20), Math.floor(termWidth * 0.3));
        const timelineWidth = termWidth - this.nameColWidth - 4; // Borders/Padding

        let output = `${theme.success}?${ANSI.RESET} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET}\n`;

        // 1. Header (Timeline Axis)
        // Simple tick marks every 10 chars
        const headerPadding = ' '.repeat(this.nameColWidth + 2);
        let headerLine = '';
        for (let i = 0; i < timelineWidth; i += 10) {
            const timeAtTick = new Date(this.viewStartDate + (i * this.msPerChar));
            // Format: MM/DD or HH:mm depending on zoom
            const tickLabel = this.formatDateCompact(timeAtTick);
            // Ensure we don't overflow
            if (i + tickLabel.length < timelineWidth) {
                // Pad until i
                const currentLen = stringWidth(headerLine);
                const spacesNeeded = i - currentLen;
                if (spacesNeeded > 0) {
                    headerLine += ' '.repeat(spacesNeeded) + tickLabel;
                }
            }
        }
        output += `${headerPadding}${ANSI.FG_GRAY}${headerLine}${ANSI.RESET}\n`;

        // 2. Vertical Scrolling Logic
        if (this.cursor < this.scrollTop) {
            this.scrollTop = this.cursor;
        } else if (this.cursor >= this.scrollTop + this.pageSize) {
            this.scrollTop = this.cursor - this.pageSize + 1;
        }

        const visibleTasks = this.tasks.slice(this.scrollTop, this.scrollTop + this.pageSize);

        // 3. Render Rows
        visibleTasks.forEach((task, index) => {
            const actualIndex = this.scrollTop + index;
            const isSelected = actualIndex === this.cursor;

            // Name Column
            let nameStr = task.name;
            if (stringWidth(nameStr) > this.nameColWidth) {
                nameStr = nameStr.slice(0, this.nameColWidth - 3) + '...';
            }
            const paddedName = nameStr.padEnd(this.nameColWidth);
            
            const prefix = isSelected ? `${theme.main}${ANSI.BOLD}> ` : '  ';
            const nameColor = isSelected ? theme.main : '';
            const reset = ANSI.RESET;

            // Timeline Bar
            // Calculate Start/End in chars relative to viewStartDate
            const startOffset = task.start.getTime() - this.viewStartDate;
            const endOffset = task.end.getTime() - this.viewStartDate;

            const startCol = Math.floor(startOffset / this.msPerChar);
            const endCol = Math.ceil(endOffset / this.msPerChar);

            let timelineStr = '';
            
            // Render the bar within the timelineWidth
            // 0........timelineWidth
            
            // Clipping
            const barStart = Math.max(0, startCol);
            const barEnd = Math.min(timelineWidth, endCol);
            
            if (barStart < timelineWidth && barEnd > 0) {
                 const preSpace = ' '.repeat(barStart);
                 const barLen = Math.max(1, barEnd - barStart);
                 const barChar = isSelected ? '█' : '━';
                 const barColor = isSelected ? theme.main : ANSI.FG_GRAY;
                 
                 // Metadata hints
                 const durationLabel = isSelected ? ` ${this.formatDuration(task.end.getTime() - task.start.getTime())}` : '';
                 
                 timelineStr = preSpace + barColor + barChar.repeat(barLen) + reset + durationLabel;
            } else if (barEnd <= 0) {
                timelineStr = ANSI.FG_GRAY + '<' + reset;
            } else {
                timelineStr = ANSI.FG_GRAY + '>' + reset;
            }

            output += `${prefix}${nameColor}${paddedName}${reset} │${timelineStr}\n`;
        });

        // Footer Help
        output += `\n${theme.muted}(Arrows: Move/Nav, Shift+Arrows: Resize, PgUp/PgDn: Scroll Time)${ANSI.RESET}`;

        this.renderFrame(output);
    }

    private formatDateCompact(d: Date): string {
        // Heuristic based on zoom level (msPerChar)
        // If 1 char > 1 day, show Month/Year
        // If 1 char > 1 hour, show Date
        // Else show Time
        const msPerDay = 86400000;
        const msPerHour = 3600000;
        
        if (this.msPerChar * 10 > msPerDay * 30) { // Very zoomed out
             return `${d.getMonth() + 1}/${d.getFullYear()}`;
        }
        if (this.msPerChar * 10 > msPerDay) {
            return `${d.getMonth() + 1}/${d.getDate()}`;
        }
        return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
    }

    private formatDuration(ms: number): string {
        const h = Math.floor(ms / 3600000);
        const d = Math.floor(h / 24);
        if (d > 0) return `${d}d ${h % 24}h`;
        return `${h}h`;
    }

    protected handleInput(char: string, key: Buffer) {
        const task = this.tasks[this.cursor];
        const step = this.msPerChar; // Move by 1 char equivalent

        if (this.isUp(char)) {
            this.cursor = (this.cursor - 1 + this.tasks.length) % this.tasks.length;
            this.render(false);
            return;
        }
        if (this.isDown(char)) {
            this.cursor = (this.cursor + 1) % this.tasks.length;
            this.render(false);
            return;
        }
        
        // PageUp/Down: Horizontal Scroll
        if (key.toString() === '\x1b[5~') { // PageUp
             this.viewStartDate -= (this.msPerChar * 10);
             this.render(false);
             return;
        }
        if (key.toString() === '\x1b[6~') { // PageDown
             this.viewStartDate += (this.msPerChar * 10);
             this.render(false);
             return;
        }

        // Shift + Arrows (Resize)
        // Note: key sequence for Shift+Arrow depends on terminal, often \x1b[1;2C or similar
        // We will try standard detection, otherwise rely on fallback or just standard arrow = move
        const isShift = key.includes(';2'); // Common modifier for Shift

        if (this.isLeft(char)) {
            if (isShift) {
                // Resize: decrease end
                const newEnd = task.end.getTime() - step;
                if (newEnd > task.start.getTime()) {
                    task.end = new Date(newEnd);
                }
            } else {
                // Move: decrease start and end
                task.start = new Date(task.start.getTime() - step);
                task.end = new Date(task.end.getTime() - step);
            }
            this.render(false);
            return;
        }

        if (this.isRight(char)) {
            if (isShift) {
                // Resize: increase end
                task.end = new Date(task.end.getTime() + step);
            } else {
                // Move: increase start and end
                task.start = new Date(task.start.getTime() + step);
                task.end = new Date(task.end.getTime() + step);
            }
            this.render(false);
            return;
        }

        if (char === '\r' || char === '\n') {
            this.submit(this.tasks);
        }
    }
}
