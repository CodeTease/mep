import { SnippetPrompt } from "../src/prompts/snippet";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sendKey = (key: string) => {
  process.stdin.emit("data", Buffer.from(key));
};

describe("SnippetPrompt", () => {
  let stdoutSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it("should submit a template without placeholders instead of crashing on edit keys", async () => {
    const prompt = new SnippetPrompt({
      message: "Snippet",
      template: "hello",
    });

    const promise = prompt.run();
    await delay(10);

    // No variable token exists, so every editing/navigation key must be a no-op.
    sendKey("x");
    sendKey("\u0008"); // Backspace
    sendKey("\u001b[D"); // Left
    sendKey("\u001b[C"); // Right
    sendKey("\t"); // Tab
    sendKey("\u001b[Z"); // Shift+Tab
    await delay(10);

    sendKey("\r");
    const result = await promise;
    expect(result).toBe("hello");
  });

  it("should still edit templates with placeholders", async () => {
    const prompt = new SnippetPrompt({
      message: "Snippet",
      template: "const ${name} = 1;",
    });

    const promise = prompt.run();
    await delay(10);

    sendKey("a");
    sendKey("b");
    await delay(10);

    sendKey("\r");
    const result = await promise;
    expect(result).toBe("const ab = 1;");
  });

  it("should keep pre-filled values and allow moving between placeholders", async () => {
    const prompt = new SnippetPrompt({
      message: "Snippet",
      template: "${a}-${b}",
      values: { a: "1", b: "2" },
    });

    const promise = prompt.run();
    await delay(10);

    // Cursor starts at the end of the first value.
    sendKey("0");
    sendKey("\t"); // Move to the second placeholder
    sendKey("3");
    await delay(10);

    sendKey("\r");
    const result = await promise;
    expect(result).toBe("10-23");
  });
});
