import { ANSI } from '../ansi';
import { theme } from '../theme';
import { symbols } from '../symbols';
import { SelectRangeOptions } from '../types';
import { SelectPrompt } from './select';

export class SelectRangePrompt<V> extends SelectPrompt<V, SelectRangeOptions<V>> {
    protected anchorIndex: number | null = null;

    constructor(options: SelectRangeOptions<V>) {
        super(options);
        if (options.initial) {
            const maxIdx = Math.max(0, options.choices.length - 1);
            this.anchorIndex = Math.min(Math.max(0, options.initial[0]), maxIdx);
            this.selectedIndex = Math.min(Math.max(0, options.initial[1]), maxIdx);
        }
    }

    protected handleInput(char: string, _key?: Buffer) {
        // Handle Enter (Submit)
        if (char === '\r' || char === '\n') {
            const choices = this.getFilteredChoices();
            if (choices.length === 0) return;
            if (this.isSeparator(choices[this.selectedIndex])) return;

            let start = this.selectedIndex;
            let end = this.selectedIndex;

            if (this.anchorIndex !== null) {
                start = Math.min(this.anchorIndex, this.selectedIndex);
                end = Math.max(this.anchorIndex, this.selectedIndex);
            }

            const selectedItems: V[] = [];
            for (let i = start; i <= end; i++) {
                const choice = choices[i];
                if (!this.isSeparator(choice)) {
                    selectedItems.push((choice as any).value);
                }
            }

            this.submit(selectedItems);
            return;
        }

        // Handle Space (Anchor)
        if (char === ' ') {
            if (this.anchorIndex === null) {
                this.anchorIndex = this.selectedIndex;
            } else {
                this.anchorIndex = null;
            }
            this.render(false);
            return;
        }

        // Delegate navigation and search to SelectPrompt
        super.handleInput(char, _key);

        // Check bounds after navigation/filtering
        const choices = this.getFilteredChoices();
        if (this.anchorIndex !== null && this.anchorIndex >= choices.length) {
            this.anchorIndex = null;
        }
    }

    protected render(_firstRender: boolean) {
        let output = '';
        const choices = this.getFilteredChoices();

        // Scroll Logic
        if (this.selectedIndex < this.scrollTop) {
            this.scrollTop = this.selectedIndex;
        } else if (this.selectedIndex >= this.scrollTop + this.pageSize) {
            this.scrollTop = this.selectedIndex - this.pageSize + 1;
        }
        if (this.scrollTop > choices.length - 1) {
            this.scrollTop = Math.max(0, choices.length - this.pageSize);
        }

        // Header
        const searchStr = this.searchBuffer ? ` ${theme.muted}(Filter: ${this.searchBuffer})${ANSI.RESET}` : '';
        output += `${theme.success}?${ANSI.RESET} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET}${searchStr}\n`;

        if (choices.length === 0) {
            output += `  ${theme.muted}No results found${ANSI.RESET}`;
        } else {
            const visibleChoices = choices.slice(this.scrollTop, this.scrollTop + this.pageSize);

            visibleChoices.forEach((choice, index) => {
                const actualIndex = this.scrollTop + index;
                if (index > 0) output += '\n';

                let isSelected = false;
                if (this.anchorIndex !== null) {
                    const min = Math.min(this.anchorIndex, this.selectedIndex);
                    const max = Math.max(this.anchorIndex, this.selectedIndex);
                    if (actualIndex >= min && actualIndex <= max) {
                        isSelected = true;
                    }
                } else if (actualIndex === this.selectedIndex) {
                    isSelected = true;
                }

                if (this.isSeparator(choice)) {
                    output += `  ${ANSI.DIM}${(choice as any).text || symbols.line.repeat(8)}${ANSI.RESET}`;
                } else {
                    interface NonSeparatorChoice {
                        title: string;
                    }
                    let prefix = '  ';
                    const title = (choice as NonSeparatorChoice).title;
                    let content = title;

                    // Anchor Marker
                    if (actualIndex === this.anchorIndex) {
                        prefix = `${theme.muted}> ${ANSI.RESET}`;
                    }

                    // Cursor Marker
                    if (actualIndex === this.selectedIndex) {
                        prefix = `${theme.main}${symbols.pointer} `;
                    }

                    // Combined Marker
                    if (actualIndex === this.selectedIndex && actualIndex === this.anchorIndex) {
                        prefix = `${theme.main}${symbols.pointer}>`;
                    }

                    // Highlighting
                    if (isSelected) {
                        // Inside the range (and not cursor/anchor which have their own prefixes)
                        if (actualIndex !== this.selectedIndex && actualIndex !== this.anchorIndex) {
                            prefix = `${theme.success}* ${ANSI.RESET}`;
                        }

                        content = `${theme.success}${title}${ANSI.RESET}`;
                    }

                    // Underline Cursor
                    if (actualIndex === this.selectedIndex) {
                        content = `${ANSI.UNDERLINE}${content}${ANSI.RESET}`;
                    }

                    output += `${prefix}${content}`;
                }
            });
        }

        output += `\n${theme.muted}(Space to anchor, Enter to submit)${ANSI.RESET}`;

        this.renderFrame(output);
    }
}
