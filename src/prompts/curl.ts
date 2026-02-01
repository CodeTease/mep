import { Prompt } from '../base';
import { ANSI } from '../ansi';
import { theme } from '../theme';
import { symbols } from '../symbols';
import { MapPrompt } from './map';
import { CodePrompt } from './code';
import { highlightJson } from '../highlight';
import { stringWidth } from '../utils';

export interface CurlOptions {
    message: string;
    defaultMethod?: string;
    defaultUrl?: string;
    defaultHeaders?: Record<string, string>;
    defaultBody?: string;
}

export interface CurlResult {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: string;
    command: string;
}

enum Section {
    METHOD = 0,
    URL = 1,
    HEADERS = 2,
    BODY = 3,
}

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

export class CurlPrompt extends Prompt<CurlResult, CurlOptions> {
    private section: Section = Section.METHOD;
    private methodIndex: number = 0;
    private url: string = '';
    private headers: Record<string, string> = {};
    private body: string = '';
    
    // For URL input
    private urlCursor: number = 0;
    private lastLinesUp: number = 0;

    constructor(options: CurlOptions) {
        super(options);
        
        // Initialize state
        if (options.defaultMethod) {
            const idx = METHODS.indexOf(options.defaultMethod.toUpperCase());
            if (idx >= 0) this.methodIndex = idx;
        }
        
        this.url = options.defaultUrl || '';
        this.urlCursor = this.url.length;
        
        this.headers = { ...options.defaultHeaders };
        this.body = options.defaultBody || '';
        
        // Auto-select URL if method is GET (default)
        if (this.methodIndex === 0) {
            this.section = Section.URL;
        }
    }

    private get currentMethod(): string {
        return METHODS[this.methodIndex];
    }
    
    private get hasBody(): boolean {
        return this.currentMethod !== 'GET' && this.currentMethod !== 'HEAD';
    }

    private generateCommand(): string {
        let cmd = `curl -X ${this.currentMethod}`;
        
        // Headers
        Object.entries(this.headers).forEach(([k, v]) => {
            cmd += ` -H "${k}: ${v}"`;
        });
        
        // Body
        if (this.hasBody && this.body) {
            // Escape quotes for shell
            const escapedBody = this.body.replace(/"/g, '\\"');
            cmd += ` -d "${escapedBody}"`;
        }
        
        // URL
        if (this.url) {
            cmd += ` "${this.url}"`;
        } else {
            cmd += ` "http://localhost..."`;
        }
        
        return cmd;
    }

    protected render(firstRender: boolean) {
        if (!firstRender && this.lastLinesUp > 0) {
            this.print(`\x1b[${this.lastLinesUp}B`);
        }
        this.lastLinesUp = 0;

        let output = '';
        
        // Title
        output += `${theme.success}? ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET}\n`;
        
        // 1. Method
        const methodLabel = this.section === Section.METHOD 
            ? `${theme.main}${ANSI.REVERSE} ${this.currentMethod} ${ANSI.RESET}` 
            : `${ANSI.BOLD}[${this.currentMethod}]${ANSI.RESET}`;
        
        output += `\n${methodLabel}`;
        
        // 2. URL
        const urlActive = this.section === Section.URL;
        const urlPrefix = urlActive ? `${theme.main}${ANSI.BOLD} URL: ${ANSI.RESET}` : ` URL: `;
        let urlDisplay = this.url;
        if (!urlDisplay && urlActive) {
             urlDisplay = `${theme.muted}http://localhost:3000${ANSI.RESET}`;
        }
        
        // Insert cursor for URL
        if (urlActive) {
            // We can't use simple string insertion if there are ansi codes (placeholder), 
            // but for simplicity, let's assume no placeholder if typing, or handle cursor visually.
            // Actually, Prompt base handles cursor positioning if we tell it where.
            // But here we are rendering a full UI. 
            // We will simulate cursor with ANSI.REVERSE or Underline on the char.
            
            // However, typical behavior is to hide terminal cursor and show a block char or similar.
            // Or we can rely on terminal cursor positioning at the end of render.
            // Let's rely on terminal cursor for URL section.
        }

        output += `${urlPrefix}${urlDisplay}\n`;

        // 3. Headers
        const headersCount = Object.keys(this.headers).length;
        const headersActive = this.section === Section.HEADERS;
        const headersPointer = headersActive ? `${theme.main}${symbols.pointer} ` : '  ';
        const headersStyle = headersActive ? `${theme.main}${ANSI.UNDERLINE}` : '';
        output += `${headersPointer}${headersStyle}HEADERS${ANSI.RESET} (${headersCount} defined)\n`;

        // 4. Body
        if (this.hasBody) {
            const bodyActive = this.section === Section.BODY;
            const bodyPointer = bodyActive ? `${theme.main}${symbols.pointer} ` : '  ';
            const bodyStyle = bodyActive ? `${theme.main}${ANSI.UNDERLINE}` : '';
            
            let bodyPreview = '';
            if (this.body) {
                const oneLiner = this.body.replace(/\n/g, ' ').substring(0, 40);
                bodyPreview = `${theme.muted} ${oneLiner}...${ANSI.RESET}`;
            } else {
                bodyPreview = `${theme.muted} (empty)${ANSI.RESET}`;
            }
            
            output += `${bodyPointer}${bodyStyle}BODY${ANSI.RESET}${bodyPreview}\n`;
        } else {
            output += `  ${theme.muted}BODY (Disabled for ${this.currentMethod})${ANSI.RESET}\n`;
        }
        
        // Preview
        output += `\n${ANSI.BOLD}Preview:${ANSI.RESET}\n`;
        const cmd = this.generateCommand();
        // Syntax highlight command (basic)
        output += `${ANSI.FG_CYAN}${cmd}${ANSI.RESET}\n`;
        
        // Instructions
        output += `\n${theme.muted}(Tab: Nav, Space: Toggle Method, Enter: Edit/Submit)${ANSI.RESET}`;
        
        this.renderFrame(output);

        // Cursor Positioning
        if (this.section === Section.URL) {
            // Calculate where the URL input starts
            // Lines: Title(1) + Method(2) + URL(1) ...
            // Wait, Method starts with \n.
            
            // Title: 1 line
            // \n
            // Method: 1 line
            // URL: 1 line
            
            // We need exact line count.
            // title \n
            // \n method \n
            // url \n
            // headers \n
            // body \n
            // \n preview \n cmd \n
            // \n instructions
            
            // Current Layout in renderFrame:
            // Line 0: Title
            // Line 1: empty
            // Line 2: Method
            // Line 3: URL Prefix + URL
            
            // So URL is on line 3 (0-indexed).
            
            // Calculate X position
            // Prefix " URL: " length. 
            // " URL: " is 6 chars.
            // "URL" is bold if active? No, prefix is constructed.
            // urlPrefix length without ANSI.
            
            const prefixLen = 6; // " URL: "
            const cursorRow = 3;
            
            // We need to move cursor to (row 3, prefixLen + this.urlCursor)
            
            const totalLines = output.split('\n').length; // Approximation
            // Actually renderFrame calculates diff.
            // We need to move relative to the BOTTOM of the output.
            
            // renderFrame moves cursor to bottom right.
            
            // Let's count lines from bottom.
            // Instructions: 1
            // \n: 1
            // cmd: 1
            // preview: 1
            // \n: 1
            // Body: 1
            // Headers: 1
            // URL: 1
            
            // Lines from bottom to URL line:
            // Instructions(1) + PreviewBlock(4) + Body(1) + Headers(1) = 7 lines?
            
            // Let's count explicitly.
            const lines = output.split('\n');
            const urlLineIndex = lines.findIndex(l => l.includes(' URL: '));
            const linesFromBottom = lines.length - 1 - urlLineIndex;
            
            this.print(ANSI.SHOW_CURSOR);
            if (linesFromBottom > 0) {
                this.print(`\x1b[${linesFromBottom}A`);
                this.lastLinesUp = linesFromBottom;
            }
            
            const targetCol = prefixLen + this.urlCursor;
            this.print(`\r\x1b[${targetCol}C`);
        } else {
            this.print(ANSI.HIDE_CURSOR);
        }
    }

    protected handleInput(char: string, buffer: Buffer) {
        // Navigation
        if (char === '\t') {
            this.cycleSection(1);
            this.render(false);
            return;
        }
        
        if (char === '\u001b[Z') { // Shift+Tab
            this.cycleSection(-1);
            this.render(false);
            return;
        }

        // Section Specifics
        switch (this.section) {
            case Section.METHOD:
                if (char === ' ' || this.isRight(char) || this.isDown(char)) {
                    this.methodIndex = (this.methodIndex + 1) % METHODS.length;
                    this.render(false);
                } else if (this.isLeft(char) || this.isUp(char)) {
                    this.methodIndex = (this.methodIndex - 1 + METHODS.length) % METHODS.length;
                    this.render(false);
                } else if (char === '\r' || char === '\n') {
                    // Enter on Method -> Submit
                    this.submitResult();
                }
                break;

            case Section.URL:
                if (char === '\r' || char === '\n') {
                    this.submitResult();
                    return;
                }
                
                // Typing
                if (char === '\u0008' || char === '\x7f') { // Backspace
                    if (this.urlCursor > 0) {
                        this.url = this.url.slice(0, this.urlCursor - 1) + this.url.slice(this.urlCursor);
                        this.urlCursor--;
                        this.render(false);
                    }
                } else if (this.isLeft(char)) {
                    if (this.urlCursor > 0) {
                        this.urlCursor--;
                        this.render(false);
                    }
                } else if (this.isRight(char)) {
                    if (this.urlCursor < this.url.length) {
                        this.urlCursor++;
                        this.render(false);
                    }
                } else if (!/^[\x00-\x1F]/.test(char)) {
                    this.url = this.url.slice(0, this.urlCursor) + char + this.url.slice(this.urlCursor);
                    this.urlCursor += char.length;
                    this.render(false);
                }
                break;

            case Section.HEADERS:
                if (char === '\r' || char === '\n') {
                    this.editHeaders();
                }
                break;

            case Section.BODY:
                if (char === '\r' || char === '\n') {
                    this.editBody();
                }
                break;
        }
    }

    private cycleSection(direction: 1 | -1) {
        // Logic to skip disabled Body
        let next = this.section + direction;
        
        // Loop
        if (next > Section.BODY) next = Section.METHOD;
        if (next < Section.METHOD) next = Section.BODY;
        
        // If Body is disabled and we landed on it
        if (next === Section.BODY && !this.hasBody) {
            next = direction === 1 ? Section.METHOD : Section.HEADERS;
        }
        
        this.section = next;
    }

    private async editHeaders() {
        this.pauseInput();
        // Clear screen below or overlay? 
        // MapPrompt renders its own frame.
        // We probably want to clear our UI or let MapPrompt render over it.
        // Since Prompts use linear scan, MapPrompt will overwrite our last lines.
        // But MapPrompt might be shorter or taller.
        
        // To be safe, let's clear our output to avoid artifacts?
        // Or just let MapPrompt handle it.
        // Since we pause input, we just wait.
        
        try {
            const result = await new MapPrompt({
                message: 'Edit Headers',
                initial: this.headers,
            }).run();
            this.headers = result;
        } catch (e) {
            // Cancelled or error
        }
        
        this.resumeInput();
        this.render(false); // Re-render our UI
    }

    private async editBody() {
        this.pauseInput();
        
        try {
            const result = await new CodePrompt({
                message: 'Edit Body (JSON)',
                template: '${json}',
                highlight: true,
                values: this.body ? { json: this.body } : undefined
            }).run();
            this.body = result;
        } catch (e) {
            // Cancelled
        }
        
        this.resumeInput();
        this.render(false);
    }

    private submitResult() {
        this.submit({
            method: this.currentMethod,
            url: this.url,
            headers: this.headers,
            body: this.hasBody ? this.body : undefined,
            command: this.generateCommand()
        });
    }
}
