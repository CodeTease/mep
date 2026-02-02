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
        const header = `${theme.success}? ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET} ${theme.muted}(Use arrows to navigate, Enter to select)${ANSI.RESET}`;

        // Combine
        this.renderFrame(`${header}\n${content}`);
    }

    private renderList(): string {
        
        const selectedIndex = (this as any).selectedIndex;
        const scrollTop = (this as any).scrollTop;
        const pageSize = (this as any).pageSize;
        const choices = this.options.choices; // from super
        
        let output = '';
        const visibleChoices = choices.slice(scrollTop, scrollTop + pageSize);
        
        visibleChoices.forEach((choice, index) => {
            const actualIndex = scrollTop + index;
            const isSelected = actualIndex === selectedIndex;
            
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
        if (filledLines < pageSize) {
            output += '\n'.repeat(pageSize - filledLines);
        }
        
        return output;
    }

    private renderDetails(maxWidth: number): string {
        const selectedIndex = (this as any).selectedIndex;
        const license = this.licenses[selectedIndex];
        
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
