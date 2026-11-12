import { ANSI } from "../src/ansi";
import { Prompt } from "../src/base";
import { stringWidth } from "../src/utils";

class TruncateProbe extends Prompt<string, {}> {
  protected render(_firstRender: boolean): void {}

  protected handleInput(_char: string, _key: Buffer): void {}

  public truncateTo(str: string, width: number): string {
    return this.truncate(str, width);
  }
}

describe("Prompt.truncate", () => {
  const probe = new TruncateProbe({});

  it("should leave lines that fit within the width untouched", () => {
    expect(probe.truncateTo("short", 10)).toBe("short");
    expect(probe.truncateTo("exactly-80", 10)).toBe("exactly-80");
  });

  it("should keep ASCII truncation behaviour", () => {
    expect(probe.truncateTo("abcdefghij", 8)).toBe(`abcde...${ANSI.RESET}`);
  });

  it("should count box-drawing characters as one column wide", () => {
    const line = "─".repeat(12);

    // Seven box-drawing characters (7 columns) plus "..." fill width 10.
    const result = probe.truncateTo(line, 10);

    expect(result).toBe(`───────...${ANSI.RESET}`);
    expect(stringWidth(result)).toBe(10);
  });

  it("should count symbol characters as one column wide", () => {
    const line = "✔".repeat(12);

    const result = probe.truncateTo(line, 10);

    expect(result).toBe(`✔✔✔✔✔✔✔...${ANSI.RESET}`);
    expect(stringWidth(result)).toBe(10);
  });

  it("should still measure CJK characters as two columns wide", () => {
    const result = probe.truncateTo("你好世界你好世界", 10);

    expect(result).toBe(`你好世...${ANSI.RESET}`);
    expect(stringWidth(result)).toBeLessThanOrEqual(10);
  });

  it("should not split surrogate pairs", () => {
    const result = probe.truncateTo("🚀🚀🚀🚀🚀", 8);

    expect(result).toBe(`🚀🚀...${ANSI.RESET}`);
    expect(stringWidth(result)).toBeLessThanOrEqual(8);
    expect(result).not.toContain("\ud83d...");
  });

  it("should preserve leading ANSI sequences", () => {
    const result = probe.truncateTo(
      `${ANSI.FG_CYAN}${"─".repeat(12)}${ANSI.RESET}`,
      10,
    );

    expect(result).toBe(`${ANSI.FG_CYAN}───────...${ANSI.RESET}`);
    expect(stringWidth(result)).toBe(10);
  });

  it("should stop treating text after a non-SGR ANSI sequence as escape codes", () => {
    const result = probe.truncateTo(`${ANSI.HIDE_CURSOR}abcdefghij`, 8);

    expect(result).toBe(`${ANSI.HIDE_CURSOR}abcde...${ANSI.RESET}`);
    expect(stringWidth(result)).toBe(8);
  });

  it("should never exceed the requested width", () => {
    const samples = [
      "abcdefghij",
      "─".repeat(12),
      "你好世界你好世界",
      "🚀🚀🚀🚀",
      "a─你🚀".repeat(6),
    ];

    for (const sample of samples) {
      for (const width of [4, 5, 8, 10, 20]) {
        expect(
          stringWidth(probe.truncateTo(sample, width)),
        ).toBeLessThanOrEqual(width);
      }
    }
  });
});
