import { Prompt } from '../base';
import { TimeOptions, MouseEvent } from '../types';
import { ANSI } from '../ansi';

export class TimePrompt extends Prompt<string, TimeOptions> {
    private hour: number = 0;
    private minute: number = 0;
    private activeCol: number = 0; // 0: Hour, 1: Minute, 2: Meridiem (if 12h)

    constructor(options: TimeOptions) {
        super(options);
        const now = options.initial ? (typeof options.initial === 'string' ? new Date(options.initial) : options.initial) : new Date();
        // Fallback if invalid date
        if (isNaN(now.getTime())) {
             this.hour = 0;
             this.minute = 0;
        } else {
            this.hour = now.getHours();
            this.minute = now.getMinutes();
        }
        
        // Round minute to nearest step
        if (options.step) {
             this.minute = Math.round(this.minute / options.step) * options.step;
             if (this.minute >= 60) {
                 this.minute = 0;
                 this.hour = (this.hour + 1) % 24;
             }
        }
    }

    protected render(firstRender: boolean): void {
        const is12h = this.options.format === '12h';
        const step = this.options.step || 1;

        // Helpers
        const getHourDisplay = (h: number) => {
            if (is12h) {
                const val = h % 12 || 12; // 0 -> 12
                return val.toString().padStart(2, '0');
            }
            return h.toString().padStart(2, '0');
        };
        
        const getMinDisplay = (m: number) => m.toString().padStart(2, '0');
        const getMeridiem = (h: number) => h >= 12 ? 'PM' : 'AM';

        // Calculate Prev/Next values for visualization
        const adjustH = (val: number, delta: number) => {
             let n = val + delta;
             if (n < 0) n = 24 + n;
             return n % 24;
        };
        const adjustM = (val: number, delta: number) => {
             let n = val + delta;
             if (n < 0) n = 60 + n;
             return n % 60;
        };

        const curH = this.hour;
        const curM = this.minute;

        const prevH = adjustH(curH, -1);
        const nextH = adjustH(curH, 1);

        const prevM = adjustM(curM, -step);
        const nextM = adjustM(curM, step);

        // Build columns
        const colHour = [getHourDisplay(prevH), getHourDisplay(curH), getHourDisplay(nextH)];
        const colMin = [getMinDisplay(prevM), getMinDisplay(curM), getMinDisplay(nextM)];
        
        let colMer: string[] = [];
        if (is12h) {
            const curMer = getMeridiem(curH);
            const otherMer = curMer === 'AM' ? 'PM' : 'AM';
            // Visually, scrolling up/down from AM goes to PM
            colMer = [otherMer, curMer, otherMer];
        }

        const dim = ANSI.FG_GRAY;
        
        let output = `${ANSI.FG_CYAN}? ${this.options.message}${ANSI.RESET}\n`;
        
        // Render 3 lines
        for (let i = 0; i < 3; i++) {
             const isCenter = i === 1;
             
             // Render Hour
             let hStr = colHour[i];
             if (this.activeCol === 0 && isCenter) {
                 hStr = `${ANSI.FG_CYAN}${ANSI.REVERSE} ${hStr} ${ANSI.RESET}`;
             } else if (isCenter) {
                 hStr = `${ANSI.BOLD} ${hStr} ${ANSI.RESET}`;
             } else {
                 hStr = `${dim} ${hStr} ${ANSI.RESET}`;
             }

             const sep = isCenter ? ':' : ' ';
             
             // Render Minute
             let mStr = colMin[i];
             if (this.activeCol === 1 && isCenter) {
                 mStr = `${ANSI.FG_CYAN}${ANSI.REVERSE} ${mStr} ${ANSI.RESET}`;
             } else if (isCenter) {
                 mStr = `${ANSI.BOLD} ${mStr} ${ANSI.RESET}`;
             } else {
                 mStr = `${dim} ${mStr} ${ANSI.RESET}`;
             }

             let line = `  ${hStr} ${sep} ${mStr}`;

             // Render Meridiem
             if (is12h) {
                 let merStr = colMer[i];
                  if (this.activeCol === 2 && isCenter) {
                     merStr = `${ANSI.FG_CYAN}${ANSI.REVERSE} ${merStr} ${ANSI.RESET}`;
                 } else if (isCenter) {
                     merStr = `${ANSI.BOLD} ${merStr} ${ANSI.RESET}`;
                 } else {
                     merStr = `${dim} ${merStr} ${ANSI.RESET}`;
                 }
                 line += ` ${merStr}`;
             }
             
             output += line + '\n';
        }
        
        output += ANSI.FG_GRAY + "(Use Arrows/Tab to navigate)" + ANSI.RESET;

        this.renderFrame(output);
    }

    protected handleMouse(event: MouseEvent): void {
        if (event.action === 'scroll') {
            if (event.scroll === 'up') {
                this.adjustValue(-1);
            } else if (event.scroll === 'down') {
                this.adjustValue(1);
            }
            this.render(false);
        }
    }

    protected handleInput(char: string, key: Buffer): void {
        const is12h = this.options.format === '12h';
        const step = this.options.step || 1;
        const maxCols = is12h ? 2 : 1; // 0, 1, 2 or 0, 1

        if (char === '\r') {
             const h = this.hour.toString().padStart(2, '0');
             const m = this.minute.toString().padStart(2, '0');
             const result = is12h 
                ? `${((this.hour % 12) || 12).toString().padStart(2, '0')}:${m} ${this.hour >= 12 ? 'PM' : 'AM'}` 
                : `${h}:${m}`;
             this.submit(result);
             return;
        }

        if (char === '\t' || this.isRight(char)) {
            this.activeCol++;
            if (this.activeCol > maxCols) this.activeCol = 0;
            this.render(false);
            return;
        }
        
        if (char === '\u001b[Z' || this.isLeft(char)) { // Shift+Tab or Left
             this.activeCol--;
             if (this.activeCol < 0) this.activeCol = maxCols;
             this.render(false);
             return;
        }

        if (this.isUp(char)) {
             this.adjustValue(-1);
             this.render(false);
        } else if (this.isDown(char)) {
             this.adjustValue(1);
             this.render(false);
        }
    }

    private adjustValue(direction: number) {
        // direction: -1 (Up/Prev value, which visually is TOP, but wait...)
        // In the UI:
        // Prev (Top)
        // Curr (Center)
        // Next (Bottom)
        // If I press DOWN arrow, I expect the list to scroll DOWN, which means "Next" becomes "Curr".
        // So DOWN arrow means INCREMENT index/value.
        // UP arrow means DECREMENT index/value.
        
        if (this.activeCol === 0) { // Hour
             let newH = this.hour + direction;
             if (newH < 0) newH = 23;
             if (newH > 23) newH = 0;
             this.hour = newH;
        } else if (this.activeCol === 1) { // Minute
             const step = this.options.step || 1;
             let newM = this.minute + (direction * step);
             if (newM < 0) newM = 60 - step; // Approx wrap
             // Better wrap logic for arbitrary steps:
             if (newM < 0) newM = 60 + newM; // e.g. -5 -> 55
             if (newM >= 60) newM = newM % 60;
             this.minute = newM;
        } else if (this.activeCol === 2) { // Meridiem
             // Toggle AM/PM
             this.hour = (this.hour + 12) % 24;
        }
    }
}
