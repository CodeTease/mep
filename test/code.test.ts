import { CodePrompt } from "../src/prompts/code";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sendKey = (key: string) => {
  process.stdin.emit("data", Buffer.from(key));
};

describe("CodePrompt", () => {
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
    const prompt = new CodePrompt({
      message: "Code",
      template: '{"a":1}',
    });

    const promise = prompt.run();
    await delay(10);

    // None of these keys have a variable to act on; they must be ignored.
    sendKey("x");
    sendKey("\u0008"); // Backspace
    sendKey("\u001b[D"); // Left
    sendKey("\u001b[C"); // Right
    await delay(10);

    sendKey("\r");
    const result = await promise;
    expect(result).toBe('{"a":1}');
  });

  it("should still edit templates with placeholders", async () => {
    const prompt = new CodePrompt({
      message: "Code",
      template: '{"name":"${name}"}',
    });

    const promise = prompt.run();
    await delay(10);

    sendKey("o");
    sendKey("k");
    await delay(10);

    sendKey("\r");
    const result = await promise;
    expect(result).toBe('{"name":"ok"}');
  });
});
