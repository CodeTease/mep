import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import type { SelectOptions } from '../types';

// --- Implementation: Select Prompt ---
export class SelectPrompt<V> extends Prompt<any, SelectOptions<V>> {
	private selectedIndex: number = 0;
	private searchBuffer: string = '';
	private scrollTop: number = 0;
	private readonly pageSize: number = 7;

	constructor(options: SelectOptions<V>) {
		super(options);
		// Find first non-separator index
		this.selectedIndex = this.findNextSelectableIndex(-1, 1);
	}

	private isSeparator(item: any): boolean {
		return item && item.separator === true;
	}

	private findNextSelectableIndex(
		currentIndex: number,
		direction: 1 | -1,
	): number {
		let nextIndex = currentIndex + direction;
		const choices = this.getFilteredChoices();

		// Loop around logic
		if (nextIndex < 0) nextIndex = choices.length - 1;
		if (nextIndex >= choices.length) nextIndex = 0;

		if (choices.length === 0) return 0;

		// Safety check to prevent infinite loop if all are separators (shouldn't happen in practice)
		let count = 0;
		while (this.isSeparator(choices[nextIndex]) && count < choices.length) {
			nextIndex += direction;
			if (nextIndex < 0) nextIndex = choices.length - 1;
			if (nextIndex >= choices.length) nextIndex = 0;
			count++;
		}
		return nextIndex;
	}

	private getFilteredChoices() {
		if (!this.searchBuffer) return this.options.choices;
		return this.options.choices.filter((c) => {
			if (this.isSeparator(c)) return false; // Hide separators when searching
			return (c as any).title
				.toLowerCase()
				.includes(this.searchBuffer.toLowerCase());
		});
	}

	// Custom render to handle variable height clearing
	private lastRenderHeight: number = 0;

	protected renderWrapper(firstRender: boolean) {
		if (!firstRender && this.lastRenderHeight > 0) {
			this.print(`\x1b[${this.lastRenderHeight}A`);
		}

		let output = '';
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

		// Header
		const searchStr = this.searchBuffer
			? ` ${theme.muted}(Filter: ${this.searchBuffer})${ANSI.RESET}`
			: '';
		output += `${ANSI.ERASE_LINE}${ANSI.CURSOR_LEFT}${theme.success}?${ANSI.RESET} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET}${searchStr}\n`;

		if (choices.length === 0) {
			output += `${ANSI.ERASE_LINE}${ANSI.CURSOR_LEFT}  ${theme.muted}No results found${ANSI.RESET}\n`;
		} else {
			const visibleChoices = choices.slice(
				this.scrollTop,
				this.scrollTop + this.pageSize,
			);

			visibleChoices.forEach((choice, index) => {
				const actualIndex = this.scrollTop + index;
				output += `${ANSI.ERASE_LINE}${ANSI.CURSOR_LEFT}`;
				if (this.isSeparator(choice)) {
					output += `  ${ANSI.DIM}${(choice as any).text || '────────'}${ANSI.RESET}\n`;
				} else {
					if (actualIndex === this.selectedIndex) {
						output += `${theme.main}❯ ${(choice as any).title}${ANSI.RESET}\n`;
					} else {
						output += `  ${(choice as any).title}\n`;
					}
				}
			});
		}

		this.print(output);

		// Clear remaining lines if list shrunk
		const visibleCount = Math.min(choices.length, this.pageSize);
		const currentHeight = visibleCount + 1 + (choices.length === 0 ? 1 : 0);
		const linesToClear = this.lastRenderHeight - currentHeight;
		if (linesToClear > 0) {
			for (let i = 0; i < linesToClear; i++) {
				this.print(`${ANSI.ERASE_LINE}\n`);
			}
			this.print(`\x1b[${linesToClear}A`); // Move back up
		}

		this.lastRenderHeight = currentHeight;
	}

	protected render(firstRender: boolean) {
		this.print(ANSI.HIDE_CURSOR);
		this.renderWrapper(firstRender);
	}

	protected handleInput(char: string) {
		const choices = this.getFilteredChoices();

		if (char === '\r' || char === '\n') {
			if (choices.length === 0) {
				this.searchBuffer = '';
				this.selectedIndex = this.findNextSelectableIndex(-1, 1);
				this.render(false);
				return;
			}

			if (this.isSeparator(choices[this.selectedIndex])) return;

			this.cleanup();
			this.print(ANSI.SHOW_CURSOR);
			if ((this as any)._resolve)
				(this as any)._resolve((choices[this.selectedIndex] as any).value);
			return;
		}

		if (this.isUp(char)) {
			// Up
			if (choices.length > 0) {
				this.selectedIndex = this.findNextSelectableIndex(
					this.selectedIndex,
					-1,
				);
				this.render(false);
			}
			return;
		}
		if (this.isDown(char)) {
			// Down
			if (choices.length > 0) {
				this.selectedIndex = this.findNextSelectableIndex(
					this.selectedIndex,
					1,
				);
				this.render(false);
			}
			return;
		}

		// Backspace
		if (char === '\u0008' || char === '\x7f') {
			if (this.searchBuffer.length > 0) {
				this.searchBuffer = this.searchBuffer.slice(0, -1);
				this.selectedIndex = 0; // Reset selection
				this.selectedIndex = this.findNextSelectableIndex(-1, 1);
				this.render(false);
			}
			return;
		}

		// Typing
		if (char.length === 1 && !/^[\x00-\x1F]/.test(char)) {
			this.searchBuffer += char;
			this.selectedIndex = 0; // Reset selection
			this.selectedIndex = this.findNextSelectableIndex(-1, 1);
			this.render(false);
		}
	}
}
