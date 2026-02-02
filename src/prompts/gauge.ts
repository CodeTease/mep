import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { GaugeOptions } from '../types';

export class GaugePrompt extends Prompt<string, GaugeOptions> {
    private cursor: number = 0; // 0 to 100
    private direction: 1 | -1 = 1;
    private running: boolean = true;
    private timer?: NodeJS.Timeout;
    private readonly width: number;
    private readonly safeZoneHalf: number;
    private readonly warnZoneHalf: number;
    private result: string | null = null;
    private resultColor: string = '';

    constructor(options: GaugeOptions) {
        super(options);
        this.width = options.width || 40;
        
        // Calculate safe zone logic (0-100 scale)
        // Default safe width: 20% ( +/- 10%)
        const safeParam = options.safeZone ?? 0.2; 
        
        // Convert to percentage (0-100)
        let safeWidthPct: number;
        if (safeParam <= 1) {
             safeWidthPct = safeParam * 100;
        } else {
             safeWidthPct = (safeParam / this.width) * 100;
        }
        
        this.safeZoneHalf = safeWidthPct / 2;
        // Arbitrary "Good" zone is 3x the safe zone (or until limits)
        this.warnZoneHalf = Math.max(this.safeZoneHalf * 3, 30); 
    }

    public run(): Promise<string> {
        // Start the loop when run is called (after initial render)
        const p = super.run();
        this.startLoop();
        return p;
    }

    private startLoop() {
        if (!this.running) return;
        this.timer = setTimeout(() => {
            this.tick();
            this.startLoop();
        }, 30); // ~33 FPS
    }

    private tick() {
        this.cursor += this.direction * 2; // Speed multiplier
        if (this.cursor >= 100) {
            this.cursor = 100;
            this.direction = -1;
        } else if (this.cursor <= 0) {
            this.cursor = 0;
            this.direction = 1;
        }
        this.render(false);
    }

    private stop() {
        this.running = false;
        if (this.timer) clearTimeout(this.timer);

        // Calculate score
        const center = 50;
        const distance = Math.abs(this.cursor - center);

        if (distance <= this.safeZoneHalf) {
            this.result = 'PERFECT!';
            this.resultColor = theme.success;
        } else if (distance <= this.warnZoneHalf) {
            this.result = 'GOOD';
            this.resultColor = ANSI.FG_YELLOW;
        } else {
            this.result = 'MISS';
            this.resultColor = theme.error;
        }

        this.render(false);
        
        // Wait a moment to show result, then submit
        setTimeout(() => {
            this.submit(this.result!); // Force non-null
        }, 800);
    }

    protected handleInput(char: string, _key: Buffer) {
        if (!this.running) return;

        if (char === ' ') {
            this.stop();
        }
    }

    protected render(_firstRender: boolean) {
        let output = '';
        
        // Header
        output += `${theme.success}?${ANSI.RESET} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET}\n`;

        // Draw Gauge Bar
        let barStr = '';
        const center = 50;
        
        for (let i = 0; i < this.width; i++) {
            const pct = (i / this.width) * 100;
            const dist = Math.abs(pct - center);
            
            let charColor = theme.error; // Default Miss (Red)
            
            if (dist <= this.safeZoneHalf) {
                charColor = theme.success; // Perfect (Green)
            } else if (dist <= this.warnZoneHalf) {
                charColor = ANSI.FG_YELLOW; // Good (Yellow)
            }

            // Using block characters for the bar
            barStr += `${charColor}━${ANSI.RESET}`;
        }
        
        output += `  ${barStr}\n`;

        // Draw Cursor
        // Position relative to width
        const pos = Math.floor((this.cursor / 100) * (this.width - 1));
        const padding = ' '.repeat(pos);
        output += `  ${padding}${theme.main}▲${ANSI.RESET}\n`;

        // Instructions or Result
        if (this.running) {
            output += `${theme.muted}(Press Space to Stop)${ANSI.RESET}`;
        } else {
            output += `${ANSI.BOLD}${this.resultColor}${this.result}${ANSI.RESET}`;
        }

        this.renderFrame(output);
    }

    protected cleanup() {
        if (this.timer) clearTimeout(this.timer);
        super.cleanup();
    }
}
