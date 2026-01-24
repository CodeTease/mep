import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawn } from 'child_process';
import { Prompt } from '../base';
import { EditorOptions } from '../types';
import { theme } from '../theme';
import { symbols } from '../symbols';
import { ANSI } from '../ansi';

export class EditorPrompt extends Prompt<string, EditorOptions> {
    private errorMsg: string = '';
    private status: 'pending' | 'editing' | 'done' = 'pending';
    private tempFilePath: string | null = null;

    constructor(options: EditorOptions) {
        super(options);
        // Default waitUserInput to true if not specified
        if (this.options.waitUserInput === undefined) {
            this.options.waitUserInput = true;
        }
    }

    protected cleanup() {
        if (this.tempFilePath) {
            try {
                if (fs.existsSync(this.tempFilePath)) {
                    fs.unlinkSync(this.tempFilePath);
                }
            } catch (error) {
                // Ignore cleanup errors
            }
        }
        super.cleanup();
    }

    protected render(firstRender: boolean) {
        if (this.status === 'editing') {
            return; // Don't render while editor is open (stdio inherited)
        }

        const icon = this.status === 'done' ? theme.success + symbols.tick : theme.main + '?';
        const message = `${theme.title}${this.options.message}${ANSI.RESET}`;
        const hint = this.options.waitUserInput 
            ? ` ${theme.muted}[Press <Enter> to launch editor]${ANSI.RESET}` 
            : ` ${theme.muted}[Launching editor...]${ANSI.RESET}`;

        let output = `${icon} ${ANSI.BOLD}${message}${ANSI.RESET}${hint}`;
        
        if (this.errorMsg) {
            output += `\n${theme.error}>> ${this.errorMsg}${ANSI.RESET}`;
        }

        this.renderFrame(output);

        // Auto-launch handling
        if (firstRender && this.options.waitUserInput === false) {
            // We need to delay slightly to ensure the render frame is flushed
            // and raw mode setup is complete from .run()
            setTimeout(() => {
                this.spawnEditor();
            }, 50);
        }
    }

    protected handleInput(char: string) {
        if (this.status !== 'pending') return;

        // Enter
        if (char === '\r' || char === '\n') {
            this.spawnEditor();
        }
    }

    private resolveEditor(): { cmd: string, args: string[] } {
        // 1. Env vars
        const envEditor = process.env.VISUAL || process.env.EDITOR;
        if (envEditor) {
            const parts = envEditor.split(' ');
            return { cmd: parts[0], args: parts.slice(1) };
        }

        // 2. OS specific
        if (process.platform === 'win32') {
            // Priority: notepad -> code -> wordpad
            return { cmd: 'notepad', args: [] };
        } else {
            // Unix/Linux/Mac
            // Priority: vim -> nano -> vi
            // We'll stick to 'vim' as the default safe bet if we can't detect.
            // A more robust solution would check paths, but for now we assume 'vim'.
            return { cmd: 'vim', args: [] };
        }
    }

    private spawnEditor() {
        this.status = 'editing';
        
        // 1. Prepare Temp File
        const ext = this.options.extension || '.txt';
        // Ensure extension has dot
        const safeExt = ext.startsWith('.') ? ext : '.' + ext;
        const filename = `mep-editor-${Date.now()}-${Math.floor(Math.random()*1000)}${safeExt}`;
        this.tempFilePath = path.join(os.tmpdir(), filename);
        const initialContent = this.options.initial || '';

        try {
            fs.writeFileSync(this.tempFilePath, initialContent, 'utf8');
        } catch (e) {
            this.errorMsg = `Failed to create temp file: ${(e as Error).message}`;
            this.status = 'pending';
            this.render(false);
            return;
        }

        // 2. Resolve Editor
        const { cmd, args } = this.resolveEditor();
        const editorArgs = [...args, this.tempFilePath];

        // 3. Pause Mep
        // Temporarily disable mouse tracking if it was enabled
        const shouldEnableMouse = (this.options as any).mouse !== false && this.capabilities.hasMouse;
        if (shouldEnableMouse) {
             this.print(ANSI.DISABLE_MOUSE);
        }

        // Pause stdin and raw mode to allow child process to take over TTY
        this.stdin.setRawMode(false);
        this.stdin.pause();

        // 4. Spawn
        const child = spawn(cmd, editorArgs, {
            stdio: 'inherit',
            shell: true
        });

        child.on('error', (err) => {
            this.restoreMep();
            this.status = 'pending';
            this.errorMsg = `Could not launch editor '${cmd}': ${err.message}`;
            this.render(false);
        });

        child.on('exit', (code) => {
            // 5. Read Result
            let content = initialContent;
            try {
                if (this.tempFilePath && fs.existsSync(this.tempFilePath)) {
                    content = fs.readFileSync(this.tempFilePath, 'utf8');
                    fs.unlinkSync(this.tempFilePath); // Cleanup
                    this.tempFilePath = null; // Mark as cleaned
                }
            } catch (e) {
                // Ignore read/delete errors
            }
            
            this.restoreMep();
            
            if (code !== 0) {
                 this.status = 'pending';
                 this.errorMsg = `Editor exited with code ${code}`;
                 this.render(false);
                 return;
            }

            // Success
            this.status = 'done';
            
            // Trim trailing newline which editors often add
            // We only trim the *last* newline added by the editor if it wasn't there?
            // Usually editors ensure a final newline.
            // If the user entered "abc", vim saves "abc\n". We probably want "abc".
            if (content.endsWith('\n')) {
                content = content.slice(0, -1);
            }
            if (content.endsWith('\r')) {
                 content = content.slice(0, -1);
            }
            
            this.submit(content);
        });
    }

    private restoreMep() {
        this.stdin.resume();
        this.stdin.setRawMode(true);
        
        // Re-enable mouse if it was enabled
        const shouldEnableMouse = (this.options as any).mouse !== false && this.capabilities.hasMouse;
        if (shouldEnableMouse) {
             this.print(ANSI.SET_ANY_EVENT_MOUSE + ANSI.SET_SGR_EXT_MODE_MOUSE);
        }
        this.print(ANSI.HIDE_CURSOR); // Ensure cursor is hidden again for Mep
    }
}
