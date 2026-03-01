import { ANSI } from '../ansi';
import { SelectPrompt } from './select';
import { theme } from '../theme';
import { symbols } from '../symbols';
import { LicenseOptions, License } from '../types';
import { Layout } from '../utils';
import { POPULAR_LICENSES } from '../data/licenses';

export class LicensePrompt extends SelectPrompt<string> {
    private licenses: License[];

    constructor(options: LicenseOptions) {
        // Map licenses to choices expected by SelectPrompt
        const choices = POPULAR_LICENSES.map(l => ({
            title: l.id,
            value: l.id,
            description: l.name
        }));

        super({
            ...options,
            choices
        });

        this.licenses = POPULAR_LICENSES;

        // Set initial selection if provided
        if (options.defaultLicense) {
            const idx = this.licenses.findIndex(l => l.id === options.defaultLicense);
            if (idx !== -1) {
                (this as any).selectedIndex = idx;
            }
        }
    }

    protected render(_firstRender: boolean) {
        const choices = this.getFilteredChoices();

        // Adjust Scroll Top
        if (this.selectedIndex < this.scrollTop) {
            this.scrollTop = this.selectedIndex;
        } else if (this.selectedIndex >= this.scrollTop + this.pageSize) {
            this.scrollTop = this.selectedIndex - this.pageSize + 1;
        }
        // Handle Filtering Edge Case: if list shrinks, scrollTop might be too high
        if (this.scrollTop > choices.length - 1) {
            this.scrollTop = Math.max(0, choices.length - this.pageSize);
        }

        const width = this.stdout.columns || 80;
        const gap = 2;
        const ratio = 0.3;

        // Calculate dimensions
        // Left column: 30% or min 20 chars
        // Right column: rest
        const leftWidth = Math.floor((width - gap) * ratio);
        const rightWidth = width - leftWidth - gap;

        const leftContent = this.renderList();
        const rightContent = this.renderDetails(rightWidth);

        const content = Layout.split(leftContent, rightContent, width, { ratio, gap });

        // Header
        const searchStr = this.searchBuffer ? ` ${theme.muted}(Filter: ${this.searchBuffer})${ANSI.RESET}` : '';
        const header = `${theme.success}? ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET}${searchStr} ${theme.muted}(Use arrows to navigate, Enter to select)${ANSI.RESET}`;

        // Combine
        this.renderFrame(`${header}\n${content}`);
    }

    private renderList(): string {
        const choices = this.getFilteredChoices();
        let output = '';

        if (choices.length === 0) {
            output += `  ${theme.muted}No results found${ANSI.RESET}`;
            return output + '\n'.repeat(this.pageSize - 1);
        }

        const visibleChoices = choices.slice(this.scrollTop, this.scrollTop + this.pageSize);

        visibleChoices.forEach((choice, index) => {
            const actualIndex = this.scrollTop + index;
            const isSelected = actualIndex === this.selectedIndex;

            const cursor = isSelected ? `${theme.main}${symbols.pointer}` : ' ';

            // Handle Separator type safety
            if ('separator' in choice) {
                output += `${theme.muted}${choice.text || '---'}${ANSI.RESET}\n`;
                return;
            }

            const title = isSelected ? `${theme.main}${choice.title}${ANSI.RESET}` : choice.title;

            output += `${cursor} ${title}\n`;
        });

        // Fill remaining lines to maintain height
        const filledLines = visibleChoices.length;
        if (filledLines < this.pageSize) {
            output += '\n'.repeat(this.pageSize - filledLines);
        }

        return output;
    }

    private renderDetails(maxWidth: number): string {
        const choices = this.getFilteredChoices();
        if (choices.length === 0) return '';

        const selectedChoice = choices[this.selectedIndex];
        if (!selectedChoice || 'separator' in selectedChoice) return '';

        const license = this.licenses.find(l => l.id === selectedChoice.value);

        if (!license) return '';

        let output = '';
        output += `${ANSI.BOLD}${license.name}${ANSI.RESET}\n`;

        const wrappedDesc = Layout.wrap(license.description, maxWidth);
        const coloredDesc = wrappedDesc.split('\n').map(line => `${theme.muted}${line}${ANSI.RESET}`).join('\n');

        output += `${coloredDesc}\n\n`;

        // Permissions
        if (license.permissions.length > 0) {
            output += `${ANSI.FG_GREEN}Permissions:${ANSI.RESET}\n`;
            license.permissions.forEach(p => output += ` ${theme.success}${symbols.checked} ${p}${ANSI.RESET}\n`);
            output += '\n';
        }

        // Conditions
        if (license.conditions.length > 0) {
            output += `${ANSI.FG_BLUE}Conditions:${ANSI.RESET}\n`;
            // symbols.info doesn't exist, use 'i' or similar
            license.conditions.forEach(c => output += ` ${ANSI.FG_BLUE}ℹ ${c}${ANSI.RESET}\n`);
            output += '\n';
        }

        // Limitations
        if (license.limitations.length > 0) {
            output += `${ANSI.FG_RED}Limitations:${ANSI.RESET}\n`;
            license.limitations.forEach(l => output += ` ${theme.error}${symbols.cross} ${l}${ANSI.RESET}\n`);
        }

        return output;
    }
}
