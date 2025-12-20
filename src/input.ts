// src/input.ts

import { EventEmitter } from 'events';

export class InputParser extends EventEmitter {
    private buffer: string = '';
    private timeout: NodeJS.Timeout | null = null;
    private state: 'NORMAL' | 'ESC' | 'CSI' = 'NORMAL';

    constructor() {
        super();
    }

    /**
     * Feed data into the parser.
     */
    public feed(data: Buffer) {
        // Convert buffer to string.
        // For partial multi-byte sequences at the chunk boundary,
        // buffer.toString() might produce replacement chars.
        // Ideally we should use StringDecoder, but since we are handling KeyPresses,
        // and usually a keypress is complete, simple toString often works.
        // However, the user mentioned fragmentation issues.
        // But InputParser usually receives data from stdin.
        // The core issue of fragmentation is splitting escape codes like \x1b [ A
        
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
            // CSI sequences end with 0x40-0x7E
            if (char >= '@' && char <= '~') {
                this.emitKey(this.buffer);
                this.buffer = '';
                this.state = 'NORMAL';
            }
            // Otherwise, we keep buffering (params like 1;2)
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
