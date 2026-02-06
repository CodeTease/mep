import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { RegionOptions, MouseEvent, MapRegion } from '../types';

export class RegionPrompt extends Prompt<string, RegionOptions> {
    private cursorIndex: number = 0;
    private errorMsg: string = '';

    constructor(options: RegionOptions) {
        super(options);
        if (options.initial) {
            const idx = options.regions.findIndex(r => r.id === options.initial);
            if (idx !== -1) this.cursorIndex = idx;
        }
    }

    protected render(_firstRender: boolean) {
        let output = '';

        // Title
        output += `${theme.title}${this.options.message}${ANSI.RESET}\n`;

        // Prepare Map Buffer
        const lines = this.options.mapArt.split('\n');
        const height = lines.length;
        const width = Math.max(...lines.map(l => l.length));

        // Overlay regions
        // We will build the output line by line.

        for (let y = 0; y < height; y++) {
            let line = lines[y] || '';
            // Pad line if needed
            if (line.length < width) line += ' '.repeat(width - line.length);

            // Check for regions on this line
            const regionsOnLine = this.options.regions.filter(r => Math.round(r.y) === y);

            // Reconstruct line with overlays
            // This is naive string replacement; might break if overlaps
            const lineBuffer = line.split('');

            regionsOnLine.forEach(r => {
                const label = r.label || '•';

                // Draw label starting at r.x
                for (let i = 0; i < label.length; i++) {
                    const lx = Math.round(r.x) + i;
                    if (lx < lineBuffer.length) {
                        // We don't apply color here yet, just content
                        lineBuffer[lx] = label[i];
                    }
                }
            });

            // Now render the line with coloring
            // We need to know which ranges are regions
            let renderedLine = '';
            for (let x = 0; x < lineBuffer.length; x++) {
                // Check if this x,y belongs to a region
                const activeRegion = this.options.regions.find(r =>
                    Math.round(r.y) === y &&
                    x >= Math.round(r.x) &&
                    x < Math.round(r.x) + (r.label || '•').length
                );

                if (activeRegion) {
                    const isSelected = this.options.regions[this.cursorIndex] === activeRegion;
                    if (isSelected) {
                        renderedLine += `${theme.main}${ANSI.REVERSE}${lineBuffer[x]}${ANSI.RESET}`;
                    } else {
                        renderedLine += `${theme.success}${lineBuffer[x]}${ANSI.RESET}`;
                    }
                } else {
                    renderedLine += `${ANSI.DIM}${lineBuffer[x]}${ANSI.RESET}`;
                }
            }
            output += '  ' + renderedLine + '\n';
        }

        // Region Description
        const currentRegion = this.options.regions[this.cursorIndex];
        if (currentRegion && currentRegion.description) {
            output += `\n${theme.main}❯ ${ANSI.BOLD}${currentRegion.id}${ANSI.RESET}: ${currentRegion.description}`;
        } else {
            output += `\n${theme.main}❯ ${ANSI.BOLD}${currentRegion.id}${ANSI.RESET}`;
        }

        output += `\n${ANSI.DIM}(Arrows to navigate, Enter to select)${ANSI.RESET}`;

        this.renderFrame(output);
    }

    protected handleInput(char: string, _key: Buffer) {
        if (char === '\r' || char === '\n') {
            this.submit(this.options.regions[this.cursorIndex].id);
            return;
        }

        if (this.isUp(char)) this.navigate('up');
        else if (this.isDown(char)) this.navigate('down');
        else if (this.isLeft(char)) this.navigate('left');
        else if (this.isRight(char)) this.navigate('right');
    }

    private navigate(direction: 'up' | 'down' | 'left' | 'right') {
        const current = this.options.regions[this.cursorIndex];
        let bestCandidate: MapRegion | null = null;
        let bestScore = Infinity;

        this.options.regions.forEach((r, idx) => {
            if (idx === this.cursorIndex) return;

            const dx = r.x - current.x;
            const dy = r.y - current.y;
            const distSq = dx * dx + dy * dy;

            let isValid = false;
            let anglePenalty = 0;

            // Simple direction check + Angle weighting
            // We want small distance and small angle deviation
            switch (direction) {
                case 'up':
                    if (dy < 0) {
                        isValid = true;
                        // ideal: dx=0. Penalty for dx.
                        anglePenalty = Math.abs(dx) * 0.5;
                    }
                    break;
                case 'down':
                    if (dy > 0) {
                        isValid = true;
                        anglePenalty = Math.abs(dx) * 0.5;
                    }
                    break;
                case 'left':
                    if (dx < 0) {
                        isValid = true;
                        anglePenalty = Math.abs(dy) * 2.0; // Penalize Y deviation more for horiz movement
                    }
                    break;
                case 'right':
                    if (dx > 0) {
                        isValid = true;
                        anglePenalty = Math.abs(dy) * 2.0;
                    }
                    break;
            }

            if (isValid) {
                const score = distSq + (anglePenalty * anglePenalty * 5); // Heuristic
                if (score < bestScore) {
                    bestScore = score;
                    bestCandidate = r;
                }
            }
        });

        if (bestCandidate) {
            this.cursorIndex = this.options.regions.indexOf(bestCandidate);
            this.render(false);
        }
    }

    protected handleMouse(event: MouseEvent) {
        // Cycle with scroll
        if (event.action === 'scroll') {
            if (event.scroll === 'up') {
                this.cursorIndex = (this.cursorIndex - 1 + this.options.regions.length) % this.options.regions.length;
            } else {
                this.cursorIndex = (this.cursorIndex + 1) % this.options.regions.length;
            }
            this.render(false);
        }
    }
}
