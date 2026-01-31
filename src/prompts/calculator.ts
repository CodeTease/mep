import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { symbols } from '../symbols';
import { CalculatorOptions } from '../types';
import { safeSplit, stringWidth } from '../utils';

export class CalculatorPrompt extends Prompt<number, CalculatorOptions> {
    protected errorMsg: string = '';
    protected cursor: number = 0;
    protected hasTyped: boolean = false;
    protected segments: string[] = [];
    protected lastLinesUp: number = 0;
    protected previewValue: string = '';

    constructor(options: CalculatorOptions) {
        super(options);
        this.value = options.initial ? String(options.initial) : '';
        this.segments = safeSplit(this.value);
        this.cursor = this.segments.length;
        this.updatePreview();
    }

    private updatePreview() {
        const input = this.segments.join('');
        if (!input.trim()) {
            this.previewValue = '';
            return;
        }

        try {
            const result = this.evaluate(input);
            if (result !== null && !isNaN(result) && isFinite(result)) {
                // Format precision if needed
                if (this.options.precision !== undefined) {
                    this.previewValue = parseFloat(result.toFixed(this.options.precision)).toString();
                } else {
                    this.previewValue = result.toString();
                }
            } else {
                this.previewValue = '';
            }
        } catch (_e) {
            this.previewValue = '';
        }
    }

    private evaluate(expression: string): number | null {
        let expr = expression;

        // 1. Substitute variables
        if (this.options.variables) {
            // Sort keys by length desc to avoid partial replacement issues (e.g. 'var11' vs 'var1')
            const keys = Object.keys(this.options.variables).sort((a, b) => b.length - a.length);
            for (const key of keys) {
                const val = this.options.variables[key];
                // Use regex to replace whole words only? Or direct replacement?
                // User requirement: "Substitute variable names"
                // Safer to use a regex with word boundaries
                const regex = new RegExp(`\\b${key}\\b`, 'g');
                expr = expr.replace(regex, String(val));
            }
        }

        // 2. Validate characters
        // Allowed: numbers, operators (+ - * / % ^), parens, dots, spaces
        // Also allow 'Math.' functions if we want? Plan says "Mathematical operators".
        // Let's allow basic Math constants like PI, E if needed, but strictly:
        // Filter out dangerous characters.
        // We deny letters (unless they were variables already replaced).
        // Check for any remaining letters [a-zA-Z]
        if (/[a-zA-Z_]/.test(expr)) {
             // Maybe it's a Math function?
             // Support basic Math functions: sin, cos, tan, log, sqrt, abs, pow, floor, ceil, round
             const allowedMath = ['sin', 'cos', 'tan', 'log', 'sqrt', 'abs', 'pow', 'floor', 'ceil', 'round', 'PI', 'E'];
             // We can prefix them with Math.
             
             // Simple tokenizer or just allow specific words?
             // Let's rely on a strict whitelist regex check.
             // If it has letters, they must be part of the allowed list.
             
             // Implementation: Replace allowed keywords with "MATH_KEYWORD" then check for other letters.
             let checkStr = expr;
             allowedMath.forEach(k => {
                 checkStr = checkStr.replace(new RegExp(k, 'g'), '');
             });
             
             if (/[a-zA-Z_]/.test(checkStr)) {
                 return null; // Contains unknown variables or functions
             }
             
             // Now prefix Math functions in the real expr
             allowedMath.forEach(k => {
                 // Replace 'sin(' with 'Math.sin('
                 // Be careful with PI and E
                 if (['PI', 'E'].includes(k)) {
                      expr = expr.replace(new RegExp(`\\b${k}\\b`, 'g'), `Math.${k}`);
                 } else {
                      expr = expr.replace(new RegExp(`\\b${k}\\(`, 'g'), `Math.${k}(`);
                 }
             });
        }

        // 3. Safe Eval using Function
        try {
            const func = new Function(`return (${expr})`);
            const res = func();
            return typeof res === 'number' ? res : null;
        } catch (_err) {
            return null;
        }
    }

    protected render(firstRender: boolean) {
        if (!firstRender && this.lastLinesUp > 0) {
            this.print(`\x1b[${this.lastLinesUp}B`);
        }
        this.lastLinesUp = 0;

        const icon = this.errorMsg ? `${theme.error}${symbols.cross}` : `${theme.success}?`;
        const prefix = `${icon} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET} `;
        const prefixVisualLen = this.stripAnsi(prefix).length;

        // Render Input Line
        let displayValue = '';
        const inputStr = this.segments.join('');
        
        if (!inputStr && this.options.placeholder && !this.errorMsg && !this.hasTyped) {
            displayValue = `${theme.muted}${this.options.placeholder}${ANSI.RESET}`;
        } else {
            displayValue = theme.main + inputStr + ANSI.RESET;
        }

        let output = `${prefix}${displayValue}`;

        // Add Preview Line (if available and no error)
        let previewStr = '';
        if (this.previewValue && !this.errorMsg) {
             // Display as "= Result" in muted color
             previewStr = `\n${theme.muted}= ${this.previewValue}${ANSI.RESET}`;
             output += previewStr;
        }

        if (this.errorMsg) {
             output += `\n${theme.error}>> ${this.errorMsg}${ANSI.RESET}`;
        }

        this.renderFrame(output);
        this.print(ANSI.SHOW_CURSOR);

        // Calculate cursor position
        // Lines up: 
        // If preview is present: 1 line
        // If error is present: 1 line
        // Input is always on line 0 (relative to start)
        // (Assuming single line input for Calculator)
        
        let totalRows = 1;
        if (previewStr) totalRows++;
        if (this.errorMsg) totalRows++;

        const linesUp = (totalRows - 1);
        if (linesUp > 0) {
            this.print(`\x1b[${linesUp}A`);
        }
        this.lastLinesUp = linesUp;

        // Move cursor to correct column
        // We assume single line input for now
        const cursorVisualCol = this.getVisualCursorPosition();
        const targetCol = prefixVisualLen + cursorVisualCol;

        this.print(ANSI.CURSOR_LEFT);
        if (targetCol > 0) {
            this.print(`\x1b[${targetCol}C`);
        }
    }

    private getVisualCursorPosition(): number {
        let width = 0;
        for (let i = 0; i < this.cursor; i++) {
            width += stringWidth(this.segments[i]);
        }
        return width;
    }

    protected handleInput(char: string) {
        // Enter
        if (char === '\r' || char === '\n') {
            const input = this.segments.join('');
            const result = this.evaluate(input);
            if (result === null || isNaN(result)) {
                this.errorMsg = 'Invalid expression';
                this.render(false);
                return;
            }
            
            // if (this.options.validate) {
                // Not implementing async validate for calc now to keep simple, 
                // but strictly we should. 
                // For now, assume sync validate if present, or just submit
            // }

            this.submit(result);
            return;
        }

        // Backspace
        if (char === '\u0008' || char === '\x7f') {
            this.hasTyped = true;
            if (this.cursor > 0) {
                this.segments.splice(this.cursor - 1, 1);
                this.cursor--;
                this.errorMsg = '';
                this.updatePreview();
                this.render(false);
            }
            return;
        }

        // Arrows
        if (this.isLeft(char)) {
            if (this.cursor > 0) {
                this.cursor--;
                this.render(false);
            }
            return;
        }
        if (this.isRight(char)) {
            if (this.cursor < this.segments.length) {
                this.cursor++;
                this.render(false);
            }
            return;
        }

        // Delete
        if (char === '\u001b[3~') {
            this.hasTyped = true;
            if (this.cursor < this.segments.length) {
                this.segments.splice(this.cursor, 1);
                this.errorMsg = '';
                this.updatePreview();
                this.render(false);
            }
            return;
        }

        // Normal typing
        if (!/^[\x00-\x1F]/.test(char) && !char.startsWith('\x1b')) {
            this.hasTyped = true;
            const newSegments = safeSplit(char);
            this.segments.splice(this.cursor, 0, ...newSegments);
            this.cursor += newSegments.length;
            this.errorMsg = '';
            this.updatePreview();
            this.render(false);
        }
    }
}
