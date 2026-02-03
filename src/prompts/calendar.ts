import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { CalendarOptions, MouseEvent } from '../types';

// Helper types for internal state management
type SingleSelection = Date;
type RangeSelection = [Date, Date];
type CalendarValue = SingleSelection | RangeSelection | SingleSelection[] | RangeSelection[];

// Extend options locally to support 'multiple' without breaking if types.ts isn't updated yet
interface ExtendedCalendarOptions extends CalendarOptions {
    multiple?: boolean;
}

export class CalendarPrompt extends Prompt<CalendarValue, ExtendedCalendarOptions> {
    private cursor: Date;
    private viewDate: Date; // The month currently being viewed
    
    // Store all selections here. Can be an array of Dates or Ranges.
    private selections: (SingleSelection | RangeSelection)[] = [];
    
    // Internal state for dragging/selecting a range before it is finalized
    private tempRangeStart: Date | null = null;

    constructor(options: ExtendedCalendarOptions) {
        super(options);
        
        // Initialize cursor
        this.cursor = new Date();
        this.viewDate = new Date();
        this.viewDate.setDate(1);

        // Normalize initial value into selections array
        if (options.initial) {
            // Handle array inputs (Range or Multiple Dates)
            if (Array.isArray(options.initial)) {
                const init = options.initial as any[];
                if (init.length > 0) {
                    // Detect if it is [Date, Date] (Single Range)
                    if (options.mode === 'range' && !options.multiple && init.length === 2 && init[0] instanceof Date) {
                         this.selections = [[init[0], init[1]]];
                         this.cursor = new Date(init[1]);
                    } 
                    // Detect [Date, Date][] (Multiple Ranges)
                    else if (Array.isArray(init[0])) {
                        this.selections = [...init];
                        const lastRange = init[init.length - 1];
                        this.cursor = new Date(lastRange[1]);
                    }
                    // Detect Date[] (Multiple Singles)
                    else {
                        this.selections = [...init];
                        this.cursor = new Date(init[init.length - 1]);
                    }
                }
            } else {
                // Single Date
                this.selections = [options.initial as Date];
                this.cursor = new Date(options.initial as Date);
            }
        } else {
            // If no initial value, and NOT range mode, we might optionally start with today selected?
            // For now, let's keep it empty or follow original logic behavior if needed.
             if (this.options.mode !== 'range' && !this.options.multiple) {
                 this.selections = [new Date()];
             }
        }
        
        // Sync viewDate to cursor so we see the selected date
        this.viewDate = new Date(this.cursor);
        this.viewDate.setDate(1);
    }

    private getDaysInMonth(year: number, month: number): number {
        return new Date(year, month + 1, 0).getDate();
    }

    private generateMonthGrid(year: number, month: number): { date: Date, inMonth: boolean }[] {
        const days: { date: Date, inMonth: boolean }[] = [];
        
        const firstDayOfMonth = new Date(year, month, 1);
        const startDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)
        
        const weekStart = this.options.weekStart || 0;
        
        // Calculate days from previous month to fill the first row
        const daysFromPrevMonth = (startDayOfWeek - weekStart + 7) % 7;

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

    /**
     * Check if a date is part of any committed selection
     */
    private isSelected(d: Date): boolean {
        const dTime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

        return this.selections.some(sel => {
            if (Array.isArray(sel)) {
                // Range logic
                const [start, end] = sel;
                const sTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
                const eTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
                return dTime >= Math.min(sTime, eTime) && dTime <= Math.max(sTime, eTime);
            } else {
                // Single date logic
                const sTime = new Date(sel.getFullYear(), sel.getMonth(), sel.getDate()).getTime();
                return dTime === sTime;
            }
        });
    }

    /**
     * Visual feedback for the range currently being defined (before Enter is pressed the 2nd time)
     */
    private isInTempRange(d: Date): boolean {
        if (!this.tempRangeStart) return false;
        
        const dTime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        const sTime = new Date(this.tempRangeStart.getFullYear(), this.tempRangeStart.getMonth(), this.tempRangeStart.getDate()).getTime();
        const cTime = new Date(this.cursor.getFullYear(), this.cursor.getMonth(), this.cursor.getDate()).getTime();

        return dTime >= Math.min(sTime, cTime) && dTime <= Math.max(sTime, cTime);
    }

    protected render(_firstRender: boolean): void {
        const monthNames = ["January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"
        ];
        
        const year = this.viewDate.getFullYear();
        const month = this.viewDate.getMonth();
        
        const header = `${ANSI.BOLD}${monthNames[month]} ${year}${ANSI.RESET}`;
        
        const weekDays = this.options.weekStart === 1 
            ? ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]
            : ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
            
        const grid = this.generateMonthGrid(year, month);
        
        let output = `${theme.title}${this.options.message}${ANSI.RESET}\n`;
        output += `${theme.muted}< ${header} >${ANSI.RESET}\n`;
        output += weekDays.map(d => `${theme.muted}${d}${ANSI.RESET}`).join(' ') + '\n';
        
        let rowLine = '';
        for (let i = 0; i < grid.length; i++) {
            const cell = grid[i];
            const dateStr = cell.date.getDate().toString().padStart(2, ' ');
            
            let style = '';
            
            const isCursor = this.isSameDay(cell.date, this.cursor);
            const isSel = this.isSelected(cell.date);
            const isTemp = this.isInTempRange(cell.date);
            const isToday = this.isSameDay(cell.date, new Date());
            
            if (!cell.inMonth) {
                style = theme.muted;
            }
            
            // Priority: Cursor > Temp/Selected > Today
            if (isSel || isTemp) {
                style = theme.main;
            }
            
            if (isToday && !isSel && !isTemp) {
                style += ANSI.UNDERLINE;
            }
            
            if (isCursor) {
                style += ANSI.REVERSE; // Invert colors for cursor
            }
            
            rowLine += `${style}${dateStr}${ANSI.RESET}`;
            
            if ((i + 1) % 7 === 0) {
                output += rowLine + '\n';
                rowLine = '';
            } else {
                rowLine += ' ';
            }
        }
        
        // Helper text logic
        let help = '';
        if (this.options.mode === 'range') {
             if (this.options.multiple) {
                 help = 'Enter: Range Points | D: Done';
             } else {
                 help = 'Enter: Start/End';
             }
        } else {
             if (this.options.multiple) {
                 help = 'Space/Enter: Toggle | D: Done';
             } else {
                 help = 'Enter: Select';
             }
        }
        
        if (this.tempRangeStart) {
            help += ` ${theme.muted}(Selecting range...)${ANSI.RESET}`;
        }

        output += `${theme.muted}${help}${ANSI.RESET}`;

        this.renderFrame(output);
    }

    private syncViewDate() {
        if (this.cursor.getMonth() !== this.viewDate.getMonth() || this.cursor.getFullYear() !== this.viewDate.getFullYear()) {
            this.viewDate = new Date(this.cursor);
            this.viewDate.setDate(1); 
        }
    }

    // When the user navigates the visible month independently (mouse scroll or
    // '<'/'>'), keep the cursor in the newly viewed month so subsequent
    // cursor movements don't snap the view back to the old month.
    private alignCursorToViewDate() {
        const day = this.cursor.getDate();
        const year = this.viewDate.getFullYear();
        const month = this.viewDate.getMonth();
        const daysInTarget = this.getDaysInMonth(year, month);
        const newDay = Math.min(day, daysInTarget);
        this.cursor = new Date(year, month, newDay);
    }

    private submitResult() {
        if (this.options.multiple) {
            if (this.options.mode === 'range') {
                // Only RangeSelection[]
                this.submit(this.selections.filter(Array.isArray) as RangeSelection[]);
            } else {
                // Only Date[]
                this.submit(this.selections.filter(sel => !Array.isArray(sel)) as Date[]);
            }
        } else {
            // Single Mode (Single Date or Single Range)
            this.submit(this.selections[0] || null);
        }
    }

    protected handleInput(char: string, _key: any): void {
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
              this.alignCursorToViewDate();
              this.render(false);
            return;
        }
        if (char === '>' || char === '.') {
             this.viewDate.setMonth(this.viewDate.getMonth() + 1);
               this.alignCursorToViewDate();
               this.render(false);
             return;
        }

        // Done key (only for multiple mode)
        if ((char === 'd' || char === 'D') && this.options.multiple) {
            this.submitResult();
            return;
        }

        // Selection Trigger
        if (char === '\r' || char === '\n' || char === ' ') {
            if (this.options.mode === 'range') {
                if (!this.tempRangeStart) {
                    // Start new range selection
                    this.tempRangeStart = this.cursor; 
                } else {
                    // Finish range selection
                    const start = this.tempRangeStart;
                    const end = this.cursor;
                    
                    // Normalize order
                    const newRange: RangeSelection = start < end ? [start, end] : [end, start];

                    if (this.options.multiple) {
                        this.selections.push(newRange);
                        this.tempRangeStart = null; // Reset for next range
                    } else {
                        // Single Mode: Finish and Submit
                        this.selections = [newRange];
                        this.submitResult();
                        return;
                    }
                }
            } else {
                // Single Date Mode
                const date = this.cursor;
                if (this.options.multiple) {
                    // Toggle selection
                    const idx = this.selections.findIndex(s => !Array.isArray(s) && this.isSameDay(s, date));
                    if (idx >= 0) {
                        this.selections.splice(idx, 1);
                    } else {
                        this.selections.push(date);
                    }
                } else {
                    // Single Mode: Finish and Submit
                    this.selections = [date];
                    this.submitResult();
                    return;
                }
            }
            this.render(false);
            return;
        }
    }
    
    protected handleMouse(event: MouseEvent): void {
         if (event.action === 'scroll') {
             const direction = event.scroll === 'up' ? -1 : 1;
             
             if (event.ctrl) {
                 // Ctrl+Scroll: Day (Cursor)
                 this.cursor.setDate(this.cursor.getDate() + direction);
                 this.syncViewDate();
             } else {
                 // Normal Scroll: Month
                 this.viewDate.setMonth(this.viewDate.getMonth() + direction);
                 this.alignCursorToViewDate();
             }
             
             this.render(false);
         }
    }
}