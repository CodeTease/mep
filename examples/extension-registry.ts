/**
 * Extension Registry Example
 *
 * Demonstrates how a third-party developer would create, register, and
 * invoke a custom prompt using the Mep extension system.
 */

import { MepCLI, Prompt, ANSI, type BaseOptions, stringWidth } from '../src';

// --- 1. Define custom options and augment the registry ---

interface ConfettiOptions extends BaseOptions {
    intensity?: number; // 1-5, default 3
}

declare module '../src/types' {
    interface ExtensionRegistry {
        confetti: { options: ConfettiOptions; result: string };
    }
}

// --- 2. Implement the prompt class extending Prompt<T, O> ---

const CONFETTI = ['🎉', '🎊', '✨', '🥳', '💥', '🍾'];

class ConfettiPrompt extends Prompt<string, ConfettiOptions> {
    private frame = 0;
    private interval?: ReturnType<typeof setInterval>;
    private lines: string[] = [];

    protected render(firstRender: boolean): void {
        const width = this.stdout.columns || 60;
        const intensity = this.options.intensity ?? 3;

        // Build confetti line
        const pieces: string[] = [];
        for (let i = 0; i < intensity * 4; i++) {
            const emoji = CONFETTI[Math.floor(Math.random() * CONFETTI.length)];
            const gap = ' '.repeat(Math.floor(Math.random() * 3) + 1);
            pieces.push(gap + emoji);
        }

        const confettiLine = pieces.join('');
        const title = `${ANSI.FG_YELLOW}${ANSI.BOLD} ${this.options.message} ${ANSI.RESET}`;

        // Use stringWidth (shared infra) to center the title
        const titleVisual = stringWidth(this.stripAnsi(title));
        const pad = Math.max(0, Math.floor((width - titleVisual) / 2));

        this.lines = [
            confettiLine,
            '',
            ' '.repeat(pad) + title,
            '',
            confettiLine,
            '',
            `${ANSI.FG_CYAN}  Press Enter to collect your confetti! ${ANSI.RESET}`,
        ];

        this.renderFrame(this.lines.join('\n'));

        // Animate confetti on a loop
        if (firstRender) {
            this.frame = 0;
            this.interval = setInterval(() => {
                this.frame++;
                this.render(false);
            }, 200);
        }
    }

    protected handleInput(char: string): void {
        if (char === '\r') {
            if (this.interval) clearInterval(this.interval);
            this.submit(`🎉 Confetti collected after ${this.frame} frames!`);
        }
    }
}

// --- 3. Register & Use ---

MepCLI.register('confetti', ConfettiPrompt);

try {
    const result = await MepCLI.prompt({
        type: 'confetti',
        message: 'Congratulations on your new extension!',
        intensity: 4,
    });

    console.log(`\n${result}`);
} catch (e) {
    if (e instanceof Error && e.message === 'User force closed') {
        console.log('\nCancelled.');
    } else {
        console.error('\nError:', e);
    }
}
