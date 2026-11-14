import { ANSI } from "../src/ansi";
import { MepCLI } from "../src/core";
import { TextPrompt } from "../src/prompts/text";
import { theme } from "../src/theme";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sendKey = (key: string) => {
  process.stdin.emit("data", Buffer.from(key));
};

describe("MepCLI.theme", () => {
  let stdoutSpy: jest.SpyInstance;
  const originalTheme = { ...theme, syntax: { ...theme.syntax } };

  beforeEach(() => {
    stdoutSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    Object.assign(theme, originalTheme);
    theme.syntax = { ...originalTheme.syntax };
  });

  it("applies a reassigned theme to prompts rendered afterwards", async () => {
    MepCLI.theme = { ...MepCLI.theme, title: ANSI.FG_YELLOW };

    const promise = new TextPrompt({ message: "Themed title" }).run();
    await delay(10);
    sendKey("\r");
    await expect(promise).resolves.toBe("");

    const output = stdoutSpy.mock.calls.flat().join("");
    expect(output).toContain(`${ANSI.FG_YELLOW}Themed title`);
  });

  it("still supports mutating a theme value through the facade", () => {
    MepCLI.theme = originalTheme;
    MepCLI.theme.main = ANSI.FG_BLUE;

    expect(theme.main).toBe(ANSI.FG_BLUE);
  });
});
