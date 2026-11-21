import { BytePrompt } from "../src/prompts/byte";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sendKey = (key: string) => {
  process.stdin.emit("data", Buffer.from(key));
};

describe("BytePrompt", () => {
  let stdoutSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it("returns the exact initial bytes when submitted untouched", async () => {
    const prompt = new BytePrompt({ message: "Size", initial: 1500 });

    const promise = prompt.run();
    await delay(10);
    sendKey("\r");

    await expect(promise).resolves.toBe(1500);
  });

  it("returns large untouched values without display rounding", async () => {
    const prompt = new BytePrompt({ message: "Size", initial: 1234567 });

    const promise = prompt.run();
    await delay(10);
    sendKey("\r");

    await expect(promise).resolves.toBe(1234567);
  });

  it("returns 0 when there is no initial value", async () => {
    const prompt = new BytePrompt({ message: "Size" });

    const promise = prompt.run();
    await delay(10);
    sendKey("\r");

    await expect(promise).resolves.toBe(0);
  });

  it("converts an edited value with the usual unit semantics", async () => {
    const prompt = new BytePrompt({ message: "Size", initial: 1500 });

    const promise = prompt.run();
    await delay(10);

    // Clear the displayed "1.46" KB and type 2 KB.
    sendKey("\x7f");
    sendKey("\x7f");
    sendKey("\x7f");
    sendKey("\x7f");
    sendKey("2");
    await delay(10);
    sendKey("\r");

    await expect(promise).resolves.toBe(2048);
  });

  it("still validates bounds for an untouched value", async () => {
    const prompt = new BytePrompt({
      message: "Size",
      initial: 1500,
      max: 1000,
    });

    const promise = prompt.run();
    await delay(10);
    sendKey("\r");

    let resolved = false;
    promise.then(
      () => {
        resolved = true;
      },
      () => {
        resolved = true;
      },
    );

    await delay(10);
    expect(resolved).toBe(false);

    sendKey("\u0003"); // Ctrl+C to abort the prompt
    await expect(promise).rejects.toThrow("User force closed");
  });
});
