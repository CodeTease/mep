// src/input.ts

import { EventEmitter } from 'events';

export class InputParser extends EventEmitter {
    private buffer: string = '';
    private timeout: NodeJS.Timeout | null = null;
    private state: 'NORMAL' | 'ESC' | 'CSI' | 'MOUSE_SGR' = 'NORMAL';

    constructor() {
        super();
    }

    /**
     * Feed data into the parser.
     */
    public feed(data: Buffer) {
        
        const input = data.toString('utf-8');

        for (let i = 0; i < input.length; i++) {
            const char = input[i];
            this.processChar(char);
        }
    }

    private processChar(char: string) {
        if (this.state === 'NORMAL') {
            if (char === '\x1b') {
                this.state = 'ESC';
                this.buffer = char;
                // Start a short timeout to detect bare ESC
                this.timeout = setTimeout(() => {
                    this.emitKey(this.buffer);
                    this.buffer = '';
                    this.state = 'NORMAL';
                }, 20); // 20ms timeout
            } else {
                this.emitKey(char);
            }
        } else if (this.state === 'ESC') {
            // Cancel timeout as we received more data
            if (this.timeout) clearTimeout(this.timeout);
            this.timeout = null;

            this.buffer += char;

            if (char === '[') {
                this.state = 'CSI';
            } else if (char === 'O') {
                // SS3 sequence like \x1b O A (Application Cursor Keys)
                // Treat as similar to CSI for collecting the next char
                this.state = 'CSI'; 
            } else {
                // Alt + Key or similar (\x1b + char)
                this.emitKey(this.buffer);
                this.buffer = '';
                this.state = 'NORMAL';
            }
        } else if (this.state === 'CSI') {
            this.buffer += char;

	    if (char === '<') {
                this.state = 'MOUSE_SGR';
                this.buffer = '<'; 
                return;
            }

            // CSI sequences end with 0x40-0x7E
            if (char >= '@' && char <= '~') {
                this.emitKey(this.buffer);
                this.buffer = '';
                this.state = 'NORMAL';
            }
            // Otherwise, we keep buffering (params like 1;2)
        } else if (this.state === 'MOUSE_SGR') {
            this.buffer += char;
            // SGR sequences end with 'm' (release) or 'M' (press)
            if (char === 'm' || char === 'M') {
                this.parseSGRMouse(this.buffer);
                this.buffer = '';
                this.state = 'NORMAL';
            }
        }
    }

    private parseSGRMouse(buffer: string) {
        // console.log('Parsing SGR:', buffer);
        // format: <b;x;yM or <b;x;ym
        // buffer includes the leading < and trailing M/m
        const content = buffer.slice(1, -1);
        const type = buffer.slice(-1); // m or M
        const parts = content.split(';').map(Number);
        
        if (parts.length >= 3) {
            const [b, x, y] = parts;
            let action: 'press' | 'release' | 'move' | 'scroll' = 'press';

            // Interpret button codes
            // 0: Left, 1: Middle, 2: Right
            // +32: Motion
            // 64: Scroll Up
            // 65: Scroll Down
            
            if (b === 64) {
                action = 'scroll';
                this.emit('mouse', { name: 'mouse', x, y, button: 0, action, scroll: 'up' });
                // Also emit keypress for scroll if needed? No, prompt should listen to mouse.
                // But for "Easy Features", we emit standard names
                this.emit('scrollup'); 
                return;
            }
            if (b === 65) {
                action = 'scroll';
                this.emit('mouse', { name: 'mouse', x, y, button: 0, action, scroll: 'down' });
                this.emit('scrolldown');
                return;
            }

            if (type === 'm') {
                action = 'release';
            } else {
                action = 'press';
                // Check if motion
                if (b & 32) {
                    action = 'move';
                }
            }
            
            this.emit('mouse', {
                name: 'mouse',
                x,
                y,
                button: b & 3, // Strip modifiers to get raw button 0-2
                action
            });
        }
    }

    private emitKey(key: string) {
        // Normalize Enter
        if (key === '\r') key = '\n';
        
        // We emit both the raw sequence and a normalized representation if needed,
        // but existing prompt logic handles raw strings like \x1b[A.
        // So we just emit the reconstructed sequence.
        this.emit('keypress', key, Buffer.from(key));
    }
}
