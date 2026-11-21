import { EditorPrompt } from "../src/prompts/editor";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sendKey = (key: string) => {
  process.stdin.emit("data", Buffer.from(key));
};

describe("EditorPrompt without a TTY", () => {
  let stdoutSpy: jest.SpyInstance;
  const originalIsTTY = process.stdin.isTTY;
  const originalSetRawMode = process.stdin.setRawMode;

  beforeEach(() => {
    stdoutSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    // Simulate piped/redirected stdin, as in CI and tests.
    Object.defineProperty(process.stdin, "isTTY", {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(process.stdin, "setRawMode", {
      value: undefined,
      configurable: true,
    });
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    Object.defineProperty(process.stdin, "isTTY", {
      value: originalIsTTY,
      configurable: true,
    });
    Object.defineProperty(process.stdin, "setRawMode", {
      value: originalSetRawMode,
      configurable: true,
    });
  });

  it("rejects with a clear error instead of throwing from the keypress handler", async () => {
    const baseline = process.stdin.listenerCount("data");
    const prompt = new EditorPrompt({ message: "x" });

    const promise = prompt.run();
    await delay(10);

    expect(() => sendKey("\r")).not.toThrow();

    await expect(promise).rejects.toThrow("Cannot launch editor: stdin is not a TTY");
    expect(process.stdin.listenerCount("data")).toBe(baseline);
  });

  it("settles the auto-launch path instead of hanging", async () => {
    const prompt = new EditorPrompt({
      message: "x",
      waitUserInput: false,
      initial: "draft",
    });

    await expect(prompt.run()).rejects.toThrow("Cannot launch editor: stdin is not a TTY");
  });

  it("keeps a second Enter from launching the editor twice", async () => {
    const baseline = process.stdin.listenerCount("data");
    const prompt = new EditorPrompt({ message: "x" });

    const promise = prompt.run();
    await delay(10);

    sendKey("\r\r");

    await expect(promise).rejects.toThrow("Cannot launch editor: stdin is not a TTY");
    expect(process.stdin.listenerCount("data")).toBe(baseline);
  });
});
