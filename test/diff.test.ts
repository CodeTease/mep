import { DiffPrompt } from "../src/prompts/diff";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sendKey = (key: string) => {
  process.stdin.emit("data", Buffer.from(key));
};

describe("DiffPrompt", () => {
  let stdoutSpy: jest.SpyInstance;
  const originalIsTTY = process.stdin.isTTY;
  const originalSetRawMode = process.stdin.setRawMode;

  beforeEach(() => {
    stdoutSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    // Simulate piped/redirected stdin, as in CI and tests, so the delegated
    // editor cannot launch.
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

  it("resolves with the original when that action is chosen", async () => {
    const prompt = new DiffPrompt({
      message: "d",
      original: "ORIGINAL",
      modified: "MODIFIED",
    });

    const promise = prompt.run();
    await delay(10);
    sendKey("\r");

    await expect(promise).resolves.toBe("ORIGINAL");
  });

  it("rejects instead of resolving with conflict markers when the editor cannot launch", async () => {
    const baseline = process.stdin.listenerCount("data");
    const prompt = new DiffPrompt({
      message: "d",
      original: "ORIGINAL",
      modified: "MODIFIED",
    });

    const promise = prompt.run();
    await delay(10);

    // Move to "Edit" and choose it.
    sendKey("\u001b[C");
    sendKey("\u001b[C");
    sendKey("\r");

    const result = await promise.then(
      (value) => ({ status: "resolved" as const, value }),
      (error: Error) => ({ status: "rejected" as const, error }),
    );

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.error.message).toContain("Cannot launch editor");
      expect(result.error.message).not.toContain("<<<<<<<");
    }

    // The delegated editor must not leave a stray stdin listener behind.
    expect(process.stdin.listenerCount("data")).toBe(baseline);
  });
});
