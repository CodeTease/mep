import { SpamPrompt } from "../src/prompts/spam";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sendKey = (key: string) => {
  process.stdin.emit("data", Buffer.from(key));
};

describe("SpamPrompt", () => {
  let stdoutSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  const getOutput = () =>
    stdoutSpy.mock.calls.map(([chunk]) => String(chunk)).join("");

  it("does not create a decay timer when constructed without running", () => {
    const intervalSpy = jest.spyOn(globalThis, "setInterval");

    new SpamPrompt({ message: "Spam", threshold: 5, decay: true });

    expect(intervalSpy).not.toHaveBeenCalled();
    intervalSpy.mockRestore();
  });

  it("starts the decay timer on run and clears it on cleanup", async () => {
    const intervalSpy = jest.spyOn(globalThis, "setInterval");
    const clearIntervalSpy = jest.spyOn(globalThis, "clearInterval");

    const prompt = new SpamPrompt({
      message: "Spam",
      threshold: 2,
      decay: true,
    });
    const promise = prompt.run();
    await delay(10);

    expect(intervalSpy).toHaveBeenCalledTimes(1);
    const timer = intervalSpy.mock.results[0].value;

    sendKey(" ");
    sendKey(" ");
    sendKey("\r");

    await expect(promise).resolves.toBe(true);
    expect(clearIntervalSpy).toHaveBeenCalledWith(timer);

    intervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });

  it("does not create a timer for a run without decay", async () => {
    const intervalSpy = jest.spyOn(globalThis, "setInterval");

    const prompt = new SpamPrompt({ message: "Spam", threshold: 1 });
    const promise = prompt.run();
    await delay(10);

    sendKey(" ");
    sendKey("\r");

    await expect(promise).resolves.toBe(true);
    expect(intervalSpy).not.toHaveBeenCalled();

    intervalSpy.mockRestore();
  });

  it("keeps decaying progress after run starts", async () => {
    const prompt = new SpamPrompt({
      message: "Spam",
      threshold: 5,
      decay: true,
    });
    const promise = prompt.run();
    await delay(10);

    for (let i = 0; i < 3; i++) sendKey(" ");
    await delay(10);
    expect(getOutput()).toContain("60%");

    await delay(300);
    expect(getOutput()).toContain("40%");

    // Finish the prompt so its stdin listener and timer are cleaned up.
    sendKey(" ");
    sendKey(" ");
    sendKey(" ");
    sendKey("\r");

    await expect(promise).resolves.toBe(true);
  });

  it("keeps a single decay timer across repeated run cycles", async () => {
    const intervalSpy = jest.spyOn(globalThis, "setInterval");
    const clearIntervalSpy = jest.spyOn(globalThis, "clearInterval");

    const prompt = new SpamPrompt({
      message: "Spam",
      threshold: 1,
      decay: true,
    });

    const first = prompt.run();
    await delay(10);
    sendKey(" ");
    sendKey("\r");
    await expect(first).resolves.toBe(true);

    const second = prompt.run();
    await delay(10);
    sendKey(" ");
    sendKey("\r");
    await expect(second).resolves.toBe(true);

    // Each run replaces the previous timer instead of stacking them.
    expect(intervalSpy).toHaveBeenCalledTimes(2);
    expect(clearIntervalSpy).toHaveBeenCalledTimes(2);

    intervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });
});
