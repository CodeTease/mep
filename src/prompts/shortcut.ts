import { Prompt } from '../base';
import { ShortcutOptions, ShortcutResult } from '../types';
import { ANSI } from '../ansi';
import { theme } from '../theme';

export class ShortcutPrompt extends Prompt<ShortcutResult, ShortcutOptions> {
    private currentKey?: ShortcutResult;

    constructor(options: ShortcutOptions) {
        super(options);
        this.currentKey = options.initial;
    }

    protected render(_firstRender: boolean) {
        let text = `${theme.title}${this.options.message}${ANSI.RESET} `;
        
        if (this.currentKey) {
            const parts: string[] = [];
            if (this.currentKey.ctrl) parts.push(`${ANSI.REVERSE} Ctrl ${ANSI.RESET}`);
            if (this.currentKey.meta) parts.push(`${ANSI.REVERSE} Alt ${ANSI.RESET}`);
            if (this.currentKey.shift) parts.push(`${ANSI.REVERSE} Shift ${ANSI.RESET}`);
            
            if (this.currentKey.name) {
                 parts.push(`${ANSI.FG_CYAN}[${this.currentKey.name}]${ANSI.RESET}`);
            }
            
            text += parts.join(' + ');
            text += ` ${theme.muted}(Press Enter to confirm)${ANSI.RESET}`;
        } else {
             text += `${theme.muted}Press any key combination...${ANSI.RESET}`;
        }

        this.renderFrame(text);
    }

    protected handleInput(char: string, buffer: Buffer) {
        const raw = buffer.toString();

        // Enter to confirm
        if (char === '\r' || char === '\n') {
            if (this.currentKey) {
                this.submit(this.currentKey);
            }
            return;
        }
        
        // Parse the key
        const parsed = this.parseKey(char, raw);
        if (parsed) {
            this.currentKey = parsed;
            this.render(false);
        }
    }

    private parseKey(char: string, raw: string): ShortcutResult | null {
        let name = '';
        let ctrl = false;
        let meta = false;
        let shift = false;
        
        const code = raw.charCodeAt(0);

        // Control Keys (1-26, except Backspace, Tab, Enter, Esc)
        if (code >= 1 && code <= 26) {
             // Exclude special control codes
             if (char === '\t') { // Ctrl+I
                 name = 'Tab'; 
             } else if (char === '\n' || char === '\r') { // Ctrl+J / Ctrl+M
                 name = 'Enter'; 
             } else if (char === '\b') { // Ctrl+H
                 name = 'Backspace';
             } else {
                 ctrl = true;
                 name = String.fromCharCode(code + 64); // 1 -> 'A'
             }
        } else if (code === 27) { // Escape
            if (raw.length === 1) {
                name = 'Escape';
            } else {
                 // Sequence starting with ESC
                 meta = true; // Assume Alt for ESC+Char
                 if (raw.length === 2) {
                     // Alt + Char
                     name = raw[1].toUpperCase();
                     // Check shift for Alt+Shift+Char logic?
                     if (raw[1] >= 'A' && raw[1] <= 'Z') shift = true;
                 } else {
                     // CSI sequences
                     meta = false; // Usually these are navigation
                     if (raw === '\u001b[A') name = 'Up';
                     else if (raw === '\u001b[B') name = 'Down';
                     else if (raw === '\u001b[C') name = 'Right';
                     else if (raw === '\u001b[D') name = 'Left';
                     else if (raw === '\u001b[H') name = 'Home';
                     else if (raw === '\u001b[F') name = 'End';
                     else if (raw === '\u001b[3~') name = 'Delete';
                     else if (raw === '\u001b[Z') { name = 'Tab'; shift = true; } // Shift+Tab
                     else {
                         name = 'Unknown'; 
                     }
                 }
            }
        } else if (code === 127) {
             name = 'Backspace';
        } else {
             // Regular char
             name = char.toUpperCase();
             if (char >= 'A' && char <= 'Z') shift = true;
             
             if (char === ' ') name = 'Space';
             
             // Special Symbols map? 
             // Keep it simple for now.
        }
        
        return {
            name,
            ctrl,
            shift,
            meta,
            sequence: raw
        };
    }
}
