import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { symbols } from '../symbols';
import { theme } from '../theme';
import type { CalculatorOptions } from '../types';
import { safeSplit, stringWidth } from '../utils';
import { evaluateExpression } from './calculator-expression';

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
            if (result !== null && !Number.isNaN(result) && Number.isFinite(result)) {
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
        return evaluateExpression(expression, this.options.variables);
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

        let totalRows = 1;
        if (previewStr) totalRows++;
        if (this.errorMsg) totalRows++;

        const linesUp = totalRows - 1;
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

    protected cleanup() {
        if (this.lastLinesUp > 0) {
            this.print(`\x1b[${this.lastLinesUp}B`);
            this.lastLinesUp = 0;
        }
        super.cleanup();
    }

    protected handleInput(char: string) {
        // Enter
        if (char === '\r' || char === '\n') {
            const input = this.segments.join('');
            const result = this.evaluate(input);
            if (result === null || Number.isNaN(result)) {
                this.errorMsg = 'Invalid expression';
                this.render(false);
                return;
            }

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
