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
    private interval?: ReturnType<typeof NodeJS.setInterval>;

    protected render(firstRender: boolean): void {
        const width = this.stdout.columns || 60;
        
        // Build a rotating emoji line
        const safeWidth = Math.min(width - 5, 40); // Keep it safe for Windows bounds
        let marquee = '';
        for (let i = 0; i < safeWidth / 3; i++) {
            marquee += CONFETTI[(this.frame + i) % CONFETTI.length] + '  ';
        }

        const title = `${ANSI.FG_YELLOW}${ANSI.BOLD} ${this.options.message} ${ANSI.RESET}`;
        const titleVisual = stringWidth(this.stripAnsi(title));
        const pad = Math.max(0, Math.floor((width - titleVisual) / 2));
        const marqueePad = Math.max(0, Math.floor((width - stringWidth(marquee)) / 2));

        const lines = [
            ' '.repeat(marqueePad) + marquee,
            '',
            ' '.repeat(pad) + title,
            '',
            ' '.repeat(marqueePad) + marquee,
            '',
            `${ANSI.FG_CYAN}  Press Enter to collect your confetti! ${ANSI.RESET}`,
        ];

        this.renderFrame(lines.join('\n'));

        // Animate confetti on a loop
        if (firstRender && !this.interval) {
            this.frame = 0;
            this.interval = setInterval(() => {
                this.frame++;
                this.render(false);
            }, 250);
        }
    }

    protected handleInput(char: string): void {
        if (char === '\r') {
            this.submit(`🎉 Confetti collected after ${this.frame} frames!`);
        }
    }

    protected cleanup(): void {
        if (this.interval) {
            clearInterval(this.interval);
        }
        super.cleanup();
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
