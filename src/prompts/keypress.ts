import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { KeypressOptions } from '../types';

export class KeypressPrompt extends Prompt<string, KeypressOptions> {
    constructor(options: KeypressOptions) {
        super(options);
    }

    protected render(_firstRender: boolean) {
        let output = `${theme.title}${this.options.message}${ANSI.RESET}`;
        
        if (this.options.keys) {
             const hint = this.options.keys.map(k => {
                 if (k === '\r' || k === '\n' || k === 'enter') return 'enter';
                 if (k === ' ' || k === 'space') return 'space';
                 return k;
             }).join('/');
             // Only show hint if it's short enough to be helpful, or always?
             // Let's always show it if provided, or maybe just dimmed.
             output += ` ${theme.muted}(${hint})${ANSI.RESET}`;
        } else {
             output += ` ${theme.muted}(Press any key)${ANSI.RESET}`;
        }
        
        this.renderFrame(output);
    }

    protected handleInput(char: string, _key: Buffer) {
        let keyName = char;
        if (char === '\r' || char === '\n') keyName = 'enter';
        else if (char === ' ') keyName = 'space';
        else if (char === '\u001b') keyName = 'escape';
        else if (char === '\t') keyName = 'tab';
        // Handle backspace
        else if (char === '\x7f' || char === '\b') keyName = 'backspace';

        // Check against whitelist
        if (this.options.keys) {
            const allowed = this.options.keys.map(k => k.toLowerCase());
            // Check normalized name or exact char
            if (!allowed.includes(keyName) && !allowed.includes(char)) {
                return;
            }
        }

        if (this.options.showInvisible) {
            this.print(` ${theme.success}${keyName}${ANSI.RESET}`);
        }
        
        this.submit(keyName);
    }
}
