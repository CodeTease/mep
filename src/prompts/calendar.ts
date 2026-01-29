import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { CalendarOptions, MouseEvent } from '../types';

export class CalendarPrompt extends Prompt<Date | [Date, Date], CalendarOptions> {
    private cursor: Date;
    private viewDate: Date; // The month currently being viewed
    private selection: Date | [Date, Date] | null = null;
    private selectingRange: boolean = false; // Internal state for range selection

    constructor(options: CalendarOptions) {
        super(options);
        // Normalize initial value
        if (Array.isArray(options.initial)) {
             this.selection = [new Date(options.initial[0]), new Date(options.initial[1])];
             this.cursor = new Date(options.initial[1]); // Cursor at end of range
        } else if (options.initial) {
             this.selection = new Date(options.initial);
             this.cursor = new Date(options.initial);
        } else {
             this.cursor = new Date();
             // If range mode but no initial, selection remains null until user picks
             if (this.options.mode !== 'range') {
                 this.selection = new Date();
             }
        }
        
        // Clone cursor to viewDate to track month view independently
        this.viewDate = new Date(this.cursor);
        this.viewDate.setDate(1);
    }

    private getDaysInMonth(year: number, month: number): number {
        return new Date(year, month + 1, 0).getDate();
    }

    private getDayOfWeek(year: number, month: number, day: number): number {
        return new Date(year, month, day).getDay();
    }

    private generateMonthGrid(year: number, month: number): { date: Date, inMonth: boolean }[] {
        const days: { date: Date, inMonth: boolean }[] = [];
        
        const firstDayOfMonth = new Date(year, month, 1);
        const startDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)
        
        const weekStart = this.options.weekStart || 0;
        
        // Calculate days from previous month to fill the first row
        // If startDayOfWeek is 2 (Tue) and weekStart is 0 (Sun), we need 2 days from prev month.
        // If startDayOfWeek is 0 (Sun) and weekStart is 1 (Mon), we need 6 days from prev month.
        let daysFromPrevMonth = (startDayOfWeek - weekStart + 7) % 7;
        if (daysFromPrevMonth === 0 && startDayOfWeek !== weekStart) {
             // Logic check: if starts on same day, 0. 
        }

        const prevMonthDate = new Date(year, month, 0); // Last day of prev month
        const prevMonthDaysCount = prevMonthDate.getDate();

        // Add previous month days
        for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
            days.push({
                date: new Date(year, month - 1, prevMonthDaysCount - i),
                inMonth: false
            });
        }

        // Add current month days
        const daysInMonth = this.getDaysInMonth(year, month);
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({
                date: new Date(year, month, i),
                inMonth: true
            });
        }

        // Add next month days to fill 42 cells (6 rows * 7 cols)
        let nextMonthDay = 1;
        while (days.length < 42) {
            days.push({
                date: new Date(year, month + 1, nextMonthDay++),
                inMonth: false
            });
        }

        return days;
    }

    private isSameDay(d1: Date, d2: Date): boolean {
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    }

    private isSelected(d: Date): boolean {
        if (!this.selection) return false;
        
        if (this.options.mode === 'range') {
            if (Array.isArray(this.selection)) {
                const [start, end] = this.selection;
                // If the range is complete, highlight everything in between
                // Sort to ensure valid range check even if start > end (though we should normalize)
                const s = start < end ? start : end;
                const e = start < end ? end : start;
                
                // Set times to midnight for comparison
                const dTime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
                const sTime = new Date(s.getFullYear(), s.getMonth(), s.getDate()).getTime();
                const eTime = new Date(e.getFullYear(), e.getMonth(), e.getDate()).getTime();
                
                return dTime >= sTime && dTime <= eTime;
            } else {
                 // Selecting range, but only first point picked?
                 // Usually when picking range, first click sets start, moving cursor highlights?
                 // For now, if selection is single date in range mode, just highlight it
                 return this.isSameDay(d, this.selection as Date);
            }
        } else {
             return this.isSameDay(d, this.selection as Date);
        }
    }
    
    // Helper to check if selection is 'in progress' (only one end picked) for visual feedback
    private isRangeStart(d: Date): boolean {
         if (this.options.mode !== 'range' || !this.selection) return false;
         if (Array.isArray(this.selection)) {
             return this.isSameDay(d, this.selection[0]) || this.isSameDay(d, this.selection[1]);
         }
         return this.isSameDay(d, this.selection as Date);
    }

    protected render(firstRender: boolean): void {
        const monthNames = ["January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"
        ];
        
        const year = this.viewDate.getFullYear();
        const month = this.viewDate.getMonth();
        
        const header = `${ANSI.BOLD}${monthNames[month]} ${year}${ANSI.RESET}`;
        // Centered header roughly
        const padding = Math.max(0, Math.floor((20 - header.length + 9) / 2)); // +9 for ANSI codes length approx
        // 20 is approx width of calendar (3 chars * 7 cols - 1 space = 20)
        
        // Actually grid width: 7 columns. Each cell is usually "DD ". Last col "DD".
        // Let's say cell width is 3 chars (2 digits + 1 space). Total 21 chars.
        
        const weekDays = this.options.weekStart === 1 
            ? ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]
            : ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
            
        const grid = this.generateMonthGrid(year, month);
        
        let output = `${theme.title}${this.options.message}${ANSI.RESET}\n`;
        
        // Controls hint
        output += `${theme.muted}< ${header} >${ANSI.RESET}\n`;
        
        // Weekday Header
        output += weekDays.map(d => `${theme.muted}${d}${ANSI.RESET}`).join(' ') + '\n';
        
        // Grid
        let rowLine = '';
        for (let i = 0; i < grid.length; i++) {
            const cell = grid[i];
            const dateStr = cell.date.getDate().toString().padStart(2, ' ');
            
            let style = '';
            
            const isCursor = this.isSameDay(cell.date, this.cursor);
            const isSel = this.isSelected(cell.date);
            const isToday = this.isSameDay(cell.date, new Date());
            
            // Base style
            if (!cell.inMonth) {
                style = theme.muted;
            }
            
            if (isSel) {
                // If it is selected, use main color
                style = theme.main;
            }
            
            if (isToday && !isSel) {
                style += ANSI.UNDERLINE;
            }
            
            if (isCursor) {
                style += ANSI.REVERSE; // Invert colors for cursor
            }
            
            // Apply
            // Reset must be applied after each cell to prevent bleeding
            rowLine += `${style}${dateStr}${ANSI.RESET}`;
            
            if ((i + 1) % 7 === 0) {
                output += rowLine + '\n';
                rowLine = '';
            } else {
                rowLine += ' ';
            }
        }
        
        // Helper text
        const help = this.options.mode === 'range' 
             ? 'Enter: Select start/end' 
             : 'Enter: Select';
        output += `${theme.muted}${help}${ANSI.RESET}`;

        this.renderFrame(output);
    }

    private syncViewDate() {
        if (this.cursor.getMonth() !== this.viewDate.getMonth() || this.cursor.getFullYear() !== this.viewDate.getFullYear()) {
            this.viewDate = new Date(this.cursor);
            this.viewDate.setDate(1); 
        }
    }

    protected handleInput(char: string, key: Buffer): void {
        const isUp = this.isUp(char);
        const isDown = this.isDown(char);
        const isLeft = this.isLeft(char);
        const isRight = this.isRight(char);
        
        // Navigation
        if (isUp || isDown || isLeft || isRight) {
            const d = new Date(this.cursor);
            if (isUp) d.setDate(d.getDate() - 7);
            if (isDown) d.setDate(d.getDate() + 7);
            if (isLeft) d.setDate(d.getDate() - 1);
            if (isRight) d.setDate(d.getDate() + 1);
            
            this.cursor = d;
            this.syncViewDate();
            this.render(false);
            return;
        }

        // PageUp (Month - 1)
        if (char === '\x1b[5~') {
            this.cursor.setMonth(this.cursor.getMonth() - 1);
            this.syncViewDate();
            this.render(false);
            return;
        }
        // PageDown (Month + 1)
        if (char === '\x1b[6~') {
            this.cursor.setMonth(this.cursor.getMonth() + 1);
            this.syncViewDate();
            this.render(false);
            return;
        }

        // Ctrl+Up (Year - 1)
        if (char === '\x1b[1;5A') {
            this.cursor.setFullYear(this.cursor.getFullYear() - 1);
            this.syncViewDate();
            this.render(false);
            return;
        }
        // Ctrl+Down (Year + 1)
        if (char === '\x1b[1;5B') {
            this.cursor.setFullYear(this.cursor.getFullYear() + 1);
            this.syncViewDate();
            this.render(false);
            return;
        }

        // Home (First Day of Month)
        if (char === '\x1b[H' || char === '\x1b[1~') {
            this.cursor.setDate(1);
            this.render(false);
            return;
        }

        // End (Last Day of Month)
        if (char === '\x1b[F' || char === '\x1b[4~') {
            this.cursor.setMonth(this.cursor.getMonth() + 1);
            this.cursor.setDate(0);
            this.render(false);
            return;
        }

        // t (Today)
        if (char === 't') {
            this.cursor = new Date();
            this.syncViewDate();
            this.render(false);
            return;
        }
        
        // Month Navigation with < and > (shift+, shift+.)
        if (char === '<' || char === ',') {
            this.viewDate.setMonth(this.viewDate.getMonth() - 1);
            this.render(false);
            return;
        }
        if (char === '>' || char === '.') {
             this.viewDate.setMonth(this.viewDate.getMonth() + 1);
             this.render(false);
             return;
        }

        // Selection
        if (char === '\r' || char === '\n' || char === ' ') {
            if (this.options.mode === 'range') {
                if (!this.selectingRange) {
                    // Start new range selection
                    this.selection = this.cursor; // First point (single date temporary)
                    this.selectingRange = true;
                } else {
                    // Finish range selection
                    const start = this.selection as Date;
                    const end = this.cursor;
                    
                    // Order them
                    if (start > end) {
                        this.selection = [end, start];
                    } else {
                        this.selection = [start, end];
                    }
                    this.selectingRange = false;
                    this.submit(this.selection as [Date, Date]);
                    return;
                }
            } else {
                // Single mode
                this.selection = this.cursor;
                this.submit(this.selection as Date);
                return;
            }
            this.render(false);
            return;
        }
    }
    
    protected handleMouse(event: MouseEvent): void {
         if (event.action === 'scroll') {
             const direction = event.scroll === 'up' ? -1 : 1;
             
             if (event.shift) {
                 // Shift+Scroll: Year
                 this.viewDate.setFullYear(this.viewDate.getFullYear() + direction);
             } else if (event.ctrl) {
                 // Ctrl+Scroll: Day (Cursor)
                 this.cursor.setDate(this.cursor.getDate() + direction);
                 this.syncViewDate();
             } else {
                 // Normal Scroll: Month
                 this.viewDate.setMonth(this.viewDate.getMonth() + direction);
             }
             
             this.render(false);
         }
         // Todo: Click support requires mapping X/Y to grid cells which is hard in terminal relative mode
         // We'll skip click-to-select for now unless we implement robust hit testing.
    }
}
