import { ANSI } from "../ansi";
import { symbols } from "../symbols";
import { theme } from "../theme";
import type { MultiColumnSelectOptions, SelectChoice } from "../types";
import { stringWidth } from "../utils";
import { SelectPrompt } from "./select";

export class MultiColumnSelectPrompt<V> extends SelectPrompt<
  V,
  MultiColumnSelectOptions<V>
> {
  protected cols: number = 1;
  protected colWidth: number = 0;

  constructor(options: MultiColumnSelectOptions<V>) {
    super(options);
    this.calculateLayout();
  }

  private calculateLayout() {
    const termWidth = process.stdout.columns || 80;
    const choices = this.options.choices.filter(
      (c) => !this.isSeparator(c),
    ) as SelectChoice<V>[];

    if (choices.length === 0) {
      this.cols = 1;
      this.colWidth = termWidth;
      return;
    }

    // Calculate max item width
    let maxLen = 0;
    for (const c of choices) {
      const len = stringWidth(c.title);
      if (len > maxLen) maxLen = len;
    }

    // Add padding (pointer + space + item + space)
    const itemWidth = maxLen + 4;

    if (typeof this.options.cols === "number") {
      this.cols = this.options.cols;
    } else {
      // Auto
      this.cols = Math.floor(termWidth / itemWidth);
      if (this.cols < 1) this.cols = 1;
    }

    // Final column width
    this.colWidth = Math.floor(termWidth / this.cols);
  }

  protected render(_firstRender: boolean) {
    let output = "";
    const choices = this.getFilteredChoices();

    // Header
    const searchStr = this.searchBuffer
      ? ` ${theme.muted}(Filter: ${this.searchBuffer})${ANSI.RESET}`
      : "";
    output += `${theme.success}?${ANSI.RESET} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET}${searchStr}\n`;

    if (choices.length === 0) {
      output += `  ${theme.muted}No results found${ANSI.RESET}`;
      this.renderFrame(output);
      return;
    }

    // Grid Render
    const totalRows = Math.ceil(choices.length / this.cols);

    // Adjust Scroll
    const currentRow = Math.floor(this.selectedIndex / this.cols);
    if (currentRow < this.scrollTop) {
      this.scrollTop = currentRow;
    } else if (currentRow >= this.scrollTop + this.pageSize) {
      this.scrollTop = currentRow - this.pageSize + 1;
    }

    // Edge case: if list shrinks
    if (this.scrollTop > totalRows - 1) {
      this.scrollTop = Math.max(0, totalRows - this.pageSize);
    }

    const startRow = this.scrollTop;
    const endRow = Math.min(totalRows, startRow + this.pageSize);

    for (let r = startRow; r < endRow; r++) {
      let rowStr = "";
      for (let c = 0; c < this.cols; c++) {
        const idx = r * this.cols + c;
        if (idx >= choices.length) break;

        const choice = choices[idx];

        // Truncate if needed
        let title = (choice as any).title || "";
        if (stringWidth(title) > this.colWidth - 3) {
          title = title.slice(0, this.colWidth - 4) + "…";
        }

        let cellContent = "";
        if (idx === this.selectedIndex) {
          cellContent = `${theme.main}${symbols.pointer} ${title}${ANSI.RESET}`;
        } else {
          cellContent = `  ${title}`;
        }

        // Pad cell to colWidth
        const currentWidth = stringWidth(this.stripAnsi(cellContent));
        const padding = Math.max(0, this.colWidth - currentWidth);

        // Add cell to row
        rowStr += cellContent + " ".repeat(padding);
      }
      output += rowStr + "\n";
    }

    // Remove trailing newline
    if (output.endsWith("\n")) output = output.slice(0, -1);

    this.renderFrame(output);
  }

  /**
   * Finds the closest selectable choice at (or after) `startIndex`, moving in
   * `direction`. Returns undefined when every candidate is a separator.
   */
  protected findSelectableIndex(
    startIndex: number,
    direction: 1 | -1,
    wrap: boolean,
  ): number | undefined {
    const choices = this.getFilteredChoices();
    if (choices.length === 0) return undefined;

    let index = startIndex;
    for (let count = 0; count < choices.length; count++) {
      if (index < 0 || index >= choices.length) {
        if (!wrap) return undefined;
        index = index < 0 ? choices.length - 1 : 0;
      }

      if (!this.isSeparator(choices[index])) return index;
      index += direction;
    }

    return undefined;
  }

  private moveSelection(offset: number, wrap: boolean) {
    const direction = offset > 0 ? 1 : -1;
    const next = this.findSelectableIndex(
      this.selectedIndex + offset,
      direction,
      wrap,
    );

    if (next !== undefined) {
      this.selectedIndex = next;
    }
    this.render(false);
  }

  protected handleInput(char: string) {
    const choices = this.getFilteredChoices();

    if (char === "\r" || char === "\n") {
      const choice = choices[this.selectedIndex];
      // A separator has no value, so submitting while one is highlighted would
      // resolve the prompt with undefined.
      if (!choice || this.isSeparator(choice)) return;

      this.submit(choice.value);
      return;
    }

    if (this.isUp(char)) {
      // Vertical movement keeps the cursor in its column and does not wrap.
      this.moveSelection(-this.cols, false);
      return;
    }

    if (this.isDown(char)) {
      this.moveSelection(this.cols, false);
      return;
    }

    if (this.isLeft(char)) {
      this.moveSelection(-1, true);
      return;
    }

    if (this.isRight(char)) {
      this.moveSelection(1, true);
      return;
    }

    // Backspace
    if (char === "\u0008" || char === "\x7f") {
      if (this.searchBuffer.length > 0) {
        this.searchBuffer = this.searchBuffer.slice(0, -1);
        this.selectedIndex = this.findSelectableIndex(0, 1, false) ?? 0;
        this.calculateLayout();
        this.render(false);
      }
      return;
    }

    // Typing
    if (
      char.length === 1 &&
      !/^[\x00-\x1F]/.test(char) &&
      !char.startsWith("\x1b")
    ) {
      this.searchBuffer += char;
      this.selectedIndex = this.findSelectableIndex(0, 1, false) ?? 0;
      this.render(false);
    }
  }
}
