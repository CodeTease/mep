import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { symbols } from '../symbols';
import { MatchOptions, MatchItem, MouseEvent } from '../types';
import { stringWidth } from '../utils';

export class MatchPrompt extends Prompt<Record<string, any[]>, MatchOptions> {
    private source: MatchItem[];
    private target: MatchItem[];
    // Links: Source ID -> Set of Target IDs
    private links: Map<string, Set<string>> = new Map();

    private cursorSource: number = 0;
    private cursorTarget: number = 0;
    private scrollTopSource: number = 0;
    private scrollTopTarget: number = 0;

    private activeSide: 'source' | 'target' = 'source';
    private pickedSourceIndex: number | null = null;

    private readonly pageSize: number = 10;

    constructor(options: MatchOptions) {
        super(options);
        this.source = this.normalize(options.source);
        this.target = this.normalize(options.target);
    }

    private normalize(items: (string | MatchItem)[]): MatchItem[] {
        return items.map(item => {
            if (typeof item === 'string') {
                return { id: item, label: item, value: item };
            }
            return item;
        });
    }

    protected render(_firstRender: boolean) {
        const termWidth = process.stdout.columns || 80;
        const colWidth = Math.floor((termWidth - 8) / 2); // -8 for middle spacing and borders

        // Adjust Scroll Top
        if (this.activeSide === 'source') {
            if (this.cursorSource < this.scrollTopSource) this.scrollTopSource = this.cursorSource;
            if (this.cursorSource >= this.scrollTopSource + this.pageSize) this.scrollTopSource = this.cursorSource - this.pageSize + 1;
        } else {
            if (this.cursorTarget < this.scrollTopTarget) this.scrollTopTarget = this.cursorTarget;
            if (this.cursorTarget >= this.scrollTopTarget + this.pageSize) this.scrollTopTarget = this.cursorTarget - this.pageSize + 1;
        }

        let output = `${theme.success}?${ANSI.RESET} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET}\n`;

        // Headers
        const sourceTitle = this.activeSide === 'source' ? `${theme.main}Source${ANSI.RESET}` : 'Source';
        const targetTitle = this.activeSide === 'target' ? `${theme.main}Target${ANSI.RESET}` : 'Target';

        output += `  ${sourceTitle}`.padEnd(colWidth + 2) + '    ' + `  ${targetTitle}\n`;
        output += `  ${ANSI.DIM}${symbols.line.repeat(colWidth)}${ANSI.RESET}    ${ANSI.DIM}${symbols.line.repeat(colWidth)}${ANSI.RESET}\n`;

        // Render Rows
        for (let i = 0; i < this.pageSize; i++) {
            const idxSource = this.scrollTopSource + i;
            const idxTarget = this.scrollTopTarget + i;

            const itemSource = this.source[idxSource];
            const itemTarget = this.target[idxTarget];

            // Source Column
            let sourceStr = '';

            if (itemSource) {
                const isSelected = this.activeSide === 'source' && idxSource === this.cursorSource;
                const isPicked = this.pickedSourceIndex === idxSource;
                const hasLinks = this.links.has(itemSource.id) && this.links.get(itemSource.id)!.size > 0;

                let prefix = '  ';
                if (isSelected) prefix = `${theme.main}${symbols.pointer} `;
                if (isPicked) prefix = `${theme.success}${symbols.pointer} `;

                let title = this.truncate(itemSource.label, colWidth - 4);

                // Color logic
                if (isPicked) {
                    title = `${theme.success}${title}${ANSI.RESET}`;
                } else if (hasLinks) {
                    title = `${theme.success}${title}${ANSI.RESET}`;
                } else if (isSelected) {
                    title = `${ANSI.FG_CYAN}${title}${ANSI.RESET}`;
                }

                // Indicator for links
                const linkIndicator = hasLinks ? `${theme.success}*${ANSI.RESET}` : ' ';

                sourceStr = `${prefix}${title} ${linkIndicator}`;

                // Highlight connected targets?
                if (isSelected || isPicked) {
                    // This is handled in Target render
                }
            } else {
                sourceStr = '';
            }

            // Target Column
            let targetStr = '';
            if (itemTarget) {
                const isSelected = this.activeSide === 'target' && idxTarget === this.cursorTarget;

                // Determine if this target is linked to the RELEVANT source
                // Relevant source is: Picked Source OR (if none picked) Cursor Source
                const relevantSourceIdx = this.pickedSourceIndex !== null ? this.pickedSourceIndex : this.cursorSource;
                const relevantSource = this.source[relevantSourceIdx];

                let isLinkedToRelevant = false;
                let isLinkedToAny = false;

                // Check links
                for (const [sId, tIds] of Array.from(this.links.entries())) {
                    if (tIds.has(itemTarget.id)) {
                        isLinkedToAny = true;
                        if (relevantSource && sId === relevantSource.id) {
                            isLinkedToRelevant = true;
                        }
                    }
                }

                let prefix = '  ';
                if (isSelected) prefix = `${theme.main}${symbols.pointer} `;

                let title = this.truncate(itemTarget.label, colWidth - 4);

                if (isLinkedToRelevant) {
                    title = `${theme.success}${title}${ANSI.RESET}`;
                } else if (isLinkedToAny) {
                    // Linked to someone else
                    title = `${ANSI.DIM}${title}${ANSI.RESET}`;
                } else if (isSelected) {
                    title = `${ANSI.FG_CYAN}${title}${ANSI.RESET}`;
                }

                // Indicator
                const linkIndicator = isLinkedToRelevant ? `${theme.success}<=${ANSI.RESET}` : (isLinkedToAny ? `${ANSI.DIM}<=${ANSI.RESET}` : '  ');

                targetStr = `${linkIndicator} ${prefix}${title}`;
            }

            // Pad Source
            const sourceVisualLen = itemSource ? (stringWidth(this.stripAnsi(sourceStr))) : 0;
            const padding = ' '.repeat(Math.max(0, colWidth - sourceVisualLen + 2)); // +2 extra space

            output += sourceStr + padding + '    ' + targetStr + '\n';
        }

        // Instructions
        if (this.pickedSourceIndex !== null) {
            output += `\n${theme.success}Linking: ${this.source[this.pickedSourceIndex].label}${ANSI.RESET}`;
            output += `\n${ANSI.DIM}Select Target to Link/Unlink. Esc to Cancel.${ANSI.RESET}`;
        } else {
            output += `\n${ANSI.DIM}Space to Pick Source, Enter to Submit.${ANSI.RESET}`;
        }

        this.renderFrame(output);
    }

    protected handleInput(char: string) {
        // Navigation
        if (this.isUp(char)) {
            if (this.activeSide === 'source') {
                this.cursorSource = Math.max(0, this.cursorSource - 1);
            } else {
                this.cursorTarget = Math.max(0, this.cursorTarget - 1);
            }
            this.render(false);
            return;
        }

        if (this.isDown(char)) {
            if (this.activeSide === 'source') {
                this.cursorSource = Math.min(this.source.length - 1, this.cursorSource + 1);
            } else {
                this.cursorTarget = Math.min(this.target.length - 1, this.cursorTarget + 1);
            }
            this.render(false);
            return;
        }

        // Space: Action
        if (char === ' ') {
            if (this.activeSide === 'source') {
                // Pick Source
                this.pickedSourceIndex = this.cursorSource;
                this.activeSide = 'target';
                // Try to find first linked target or stay at top?
                // Stay at top or current pos is fine.
            } else {
                // Toggle Link
                if (this.pickedSourceIndex !== null) {
                    const sId = this.source[this.pickedSourceIndex].id;
                    const tId = this.target[this.cursorTarget].id;

                    if (!this.links.has(sId)) {
                        this.links.set(sId, new Set());
                    }

                    const sourceLinks = this.links.get(sId)!;

                    if (sourceLinks.has(tId)) {
                        // Unlink
                        sourceLinks.delete(tId);
                    } else {
                        // Link
                        if (this.options.constraints?.oneToMany === false) {

                            for (const [otherSId, tIds] of Array.from(this.links.entries())) {
                                if (otherSId !== sId && tIds.has(tId)) {
                                    tIds.delete(tId);
                                }
                            }
                        }

                        sourceLinks.add(tId);
                    }
                    // Stay in Target side to allow picking more?
                }
            }
            this.render(false);
            return;
        }

        // Enter
        if (char === '\r' || char === '\n') {
            // Check Required Constraint
            if (this.options.constraints?.required) {
                // Check if all sources have at least one link
                const allLinked = this.source.every(s => {
                    return this.links.has(s.id) && this.links.get(s.id)!.size > 0;
                });

                if (!allLinked) {
                    return;
                }
            }

            // Submit Result: Record<SourceID, TargetValue[]>
            const result: Record<string, any[]> = {};
            for (const [sId, tIds] of Array.from(this.links.entries())) {
                if (tIds.size > 0) {
                    // Map Target IDs back to Values
                    const values = Array.from(tIds).map(tid => {
                        return this.target.find(t => t.id === tid)?.value;
                    });
                    result[sId] = values;
                }
            }
            this.submit(result);
            return;
        }

        // Escape / Backspace to go back to Source
        if (char === '\u001b' || char === '\u0008' || char === '\x7f' || char === 'h') { // h for vim left
            if (this.activeSide === 'target') {
                this.activeSide = 'source';
                this.pickedSourceIndex = null;
                this.render(false);
            }
            return;
        }

        // Tab
        if (char === '\t') {
            this.activeSide = this.activeSide === 'source' ? 'target' : 'source';
            // If switching to target without picking, pickedIndex is null.
            // Just viewing mode.
            if (this.activeSide === 'source') {
                this.pickedSourceIndex = null;
            }
            this.render(false);
            return;
        }
    }

    protected handleMouse(event: MouseEvent) {
        if (event.action === 'scroll') {
            if (event.scroll === 'up') {
                if (this.activeSide === 'source') {
                    this.cursorSource = Math.max(0, this.cursorSource - 1);
                } else {
                    this.cursorTarget = Math.max(0, this.cursorTarget - 1);
                }
            } else {
                if (this.activeSide === 'source') {
                    this.cursorSource = Math.min(this.source.length - 1, this.cursorSource + 1);
                } else {
                    this.cursorTarget = Math.min(this.target.length - 1, this.cursorTarget + 1);
                }
            }
            this.render(false);
        }
    }
}
