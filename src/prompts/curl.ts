import { Prompt } from '../base';
import { ANSI } from '../ansi';
import { theme } from '../theme';
import { symbols } from '../symbols';
import { MapPrompt } from './map';
import { CodePrompt } from './code';
import { safeSplit, stringWidth } from '../utils';

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
const COMMON_HEADERS = [
    'Accept', 'Accept-Encoding', 'Accept-Language',
    'Authorization', 'Cache-Control', 'Connection',
    'Content-Type', 'Cookie', 'Host',
    'Origin', 'Pragma', 'Referer',
    'User-Agent', 'X-Requested-With'
];

export class CurlPrompt extends Prompt<CurlResult, CurlOptions> {
    private section: Section = Section.METHOD;
    private methodIndex: number = 0;
    
    // URL State
    private urlSegments: string[] = [];
    private urlCursor: number = 0;

    private headers: Record<string, string> = {};
    private body: string = '';

    // Render State
    private lastLinesUp: number = 0;

    constructor(options: CurlOptions) {
        super(options);

        // Remove experimental warning if desired, or keep it until fully stable
        // this.warnExperimental(); 

        // Initialize state
        if (options.defaultMethod) {
            const idx = METHODS.indexOf(options.defaultMethod.toUpperCase());
            if (idx >= 0) this.methodIndex = idx;
        }

        const initialUrl = options.defaultUrl || '';
        this.urlSegments = safeSplit(initialUrl);
        this.urlCursor = this.urlSegments.length;

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

    private get url(): string {
        return this.urlSegments.join('');
    }

    /**
     * Escape a string for safe inclusion inside a single-quoted shell argument.
     * Single quotes are closed, an escaped single quote is inserted, and then re-opened.
     */
    private shellEscapeSingleQuoted(value: string): string {
        // e.g. "It's me" -> 'It'\''s me'
        return `'${value.replace(/'/g, "'\\''")}'`;
    }

    private generateCommand(multiline: boolean = false): string {
        const continuation = multiline ? ' \\\n  ' : ' ';
        let cmd = `curl -X ${this.currentMethod}`;

        // Headers
        Object.entries(this.headers).forEach(([k, v]) => {
            cmd += `${continuation}-H ${this.shellEscapeSingleQuoted(`${k}: ${v}`)}`;
        });

        // Body
        if (this.hasBody && this.body) {
            // Escape body for shell
            const escapedBody = this.shellEscapeSingleQuoted(this.body);
            cmd += `${continuation}-d ${escapedBody}`;
        }

        // URL
        const urlStr = this.url;
        const displayUrl = urlStr || 'http://localhost...';
        
        // Always single quote URL too for consistency and safety (e.g. if it has & or ?)
        cmd += `${continuation}${this.shellEscapeSingleQuoted(displayUrl)}`;

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
        
        let urlDisplay = '';
        if (this.urlSegments.length === 0 && urlActive) {
            // Placeholder/Empty state when active
            urlDisplay = ''; 
        } else if (this.urlSegments.length === 0 && !urlActive) {
            urlDisplay = `${theme.muted}http://localhost:3000${ANSI.RESET}`;
        } else {
            urlDisplay = this.urlSegments.join('');
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
        // Use multiline mode for preview
        const cmd = this.generateCommand(true);
        // Syntax highlight command (basic)
        output += `${ANSI.FG_CYAN}${cmd}${ANSI.RESET}\n`;

        // Instructions
        output += `\n${theme.muted}(Tab: Nav, Space: Toggle Method, Enter: Edit/Submit)${ANSI.RESET}`;

        this.renderFrame(output);

        // Cursor Positioning
        if (this.section === Section.URL) {
            const prefixLen = 6; // " URL: "

            // Use lastRenderLines to find the exact visual line index
            let urlLineIndex = -1;
            for (let i = 0; i < this.lastRenderLines.length; i++) {
                if (this.lastRenderLines[i].includes(' URL: ')) {
                    urlLineIndex = i;
                    break;
                }
            }

            if (urlLineIndex !== -1) {
                const linesFromBottom = this.lastRenderLines.length - 1 - urlLineIndex;

                this.print(ANSI.SHOW_CURSOR);
                if (linesFromBottom > 0) {
                    this.print(`\x1b[${linesFromBottom}A`);
                    this.lastLinesUp = linesFromBottom;
                }

                // Calculate visual cursor position
                let targetCol = prefixLen;
                
                // Add width of segments up to cursor
                for (let i = 0; i < this.urlCursor; i++) {
                    targetCol += stringWidth(this.urlSegments[i]);
                }

                this.print(`\r\x1b[${targetCol}C`);
            }
        } else {
            this.print(ANSI.HIDE_CURSOR);
        }
    }

    protected cleanup() {
        if (this.lastLinesUp > 0) {
            this.print(`\x1b[${this.lastLinesUp}B`);
            this.lastLinesUp = 0;
        }
        super.cleanup();
    }

    protected handleInput(char: string, _buffer: Buffer) {
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
                    this.submitResult();
                }
                break;

            case Section.URL:
                this.handleUrlInput(char);
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

    private handleUrlInput(char: string) {
        // Submit
        if (char === '\r' || char === '\n') {
            this.submitResult();
            return;
        }

        // Home
        if (char === '\x1b[H' || char === '\x1bOH' || char === '\x1b[1~') {
            this.urlCursor = 0;
            this.render(false);
            return;
        }

        // End
        if (char === '\x1b[F' || char === '\x1bOF' || char === '\x1b[4~') {
            this.urlCursor = this.urlSegments.length;
            this.render(false);
            return;
        }

        // Ctrl+U (Delete to start)
        if (char === '\x15') {
            if (this.urlCursor > 0) {
                this.urlSegments.splice(0, this.urlCursor);
                this.urlCursor = 0;
                this.render(false);
            }
            return;
        }

        // Ctrl+W (Delete word backwards)
        if (char === '\x17') {
            if (this.urlCursor > 0) {
                // Find previous word boundary
                let i = this.urlCursor - 1;
                // Skip trailing spaces
                while (i >= 0 && this.urlSegments[i] === ' ') i--;
                // Skip word characters
                while (i >= 0 && this.urlSegments[i] !== ' ') i--;
                
                const deleteCount = this.urlCursor - (i + 1);
                this.urlSegments.splice(i + 1, deleteCount);
                this.urlCursor = i + 1;
                this.render(false);
            }
            return;
        }

        // Backspace
        if (char === '\u0008' || char === '\x7f') {
            if (this.urlCursor > 0) {
                this.urlSegments.splice(this.urlCursor - 1, 1);
                this.urlCursor--;
                this.render(false);
            }
            return;
        }

        // Delete
        if (char === '\u001b[3~') {
            if (this.urlCursor < this.urlSegments.length) {
                this.urlSegments.splice(this.urlCursor, 1);
                this.render(false);
            }
            return;
        }

        // Left
        if (this.isLeft(char)) {
            if (this.urlCursor > 0) {
                this.urlCursor--;
                this.render(false);
            }
            return;
        }

        // Right
        if (this.isRight(char)) {
            if (this.urlCursor < this.urlSegments.length) {
                this.urlCursor++;
                this.render(false);
            }
            return;
        }

        // Regular Typing
        if (!/^[\x00-\x1F]/.test(char) && !char.startsWith('\x1b')) {
            const newSegments = safeSplit(char);
            this.urlSegments.splice(this.urlCursor, 0, ...newSegments);
            this.urlCursor += newSegments.length;
            this.render(false);
        }
    }

    private cycleSection(direction: 1 | -1) {
        let next = this.section + direction;
        if (next > Section.BODY) next = Section.METHOD;
        if (next < Section.METHOD) next = Section.BODY;

        if (next === Section.BODY && !this.hasBody) {
            next = direction === 1 ? Section.METHOD : Section.HEADERS;
        }

        this.section = next;
    }

    private async editHeaders() {
        this.pauseInput();
        try {
            const result = await new MapPrompt({
                message: 'Edit Headers',
                initial: this.headers,
                suggestions: COMMON_HEADERS
            }).run();
            this.headers = result;
        } catch (_e) {
            // Cancelled
        }

        this.resumeInput();
        this.render(false);
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
        } catch (_e) {
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
            command: this.generateCommand(false) // Single line for clipboard/usage
        });
    }
}
