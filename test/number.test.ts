import { NumberPrompt } from "../src/prompts/number";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sendKey = (key: string) => {
  process.stdin.emit("data", Buffer.from(key));
};

const typeText = (text: string) => {
  text.split("").forEach((char) => sendKey(char));
};

describe("NumberPrompt", () => {
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

  it("should resolve with a typed integer", async () => {
    const prompt = new NumberPrompt({ message: "Num" });

    const promise = prompt.run();
    await delay(10);

    typeText("42");
    sendKey("\r");

    await expect(promise).resolves.toBe(42);
  });

  it("should resolve with negative and decimal values", async () => {
    const prompt = new NumberPrompt({ message: "Num" });

    const promise = prompt.run();
    await delay(10);

    typeText("-3.25");
    sendKey("\r");

    await expect(promise).resolves.toBe(-3.25);
  });

  it("should accept a trailing decimal point as a whole number", async () => {
    const prompt = new NumberPrompt({ message: "Num" });

    const promise = prompt.run();
    await delay(10);

    typeText("7.");
    sendKey("\r");

    await expect(promise).resolves.toBe(7);
  });

  it("should reject malformed input instead of resolving with a different value", async () => {
    const prompt = new NumberPrompt({ message: "Num" });

    const promise = prompt.run();
    await delay(10);

    typeText("1.2.3");
    sendKey("\r");
    await delay(10);

    let resolved = false;
    promise.then(() => {
      resolved = true;
    });

    await delay(10);
    expect(resolved).toBe(false);
    expect(getOutput()).toContain("Please enter a valid number.");

    // Remove the trailing ".3" so the displayed value becomes valid again.
    sendKey("\x7f");
    sendKey("\x7f");
    sendKey("\r");

    await expect(promise).resolves.toBe(1.2);
  });

  it("should reject a lone minus sign or decimal point", async () => {
    const prompt = new NumberPrompt({ message: "Num" });

    const promise = prompt.run();
    await delay(10);

    typeText("-");
    sendKey("\r");
    await delay(10);

    let resolved = false;
    promise.then(() => {
      resolved = true;
    });

    await delay(10);
    expect(resolved).toBe(false);
    expect(getOutput()).toContain("Please enter a valid number.");

    // Replace "-" with "-." which is still invalid, then finish with "-1".
    sendKey(".");
    sendKey("\r");
    await delay(10);
    expect(resolved).toBe(false);

    sendKey("\x7f");
    typeText("1");
    sendKey("\r");

    await expect(promise).resolves.toBe(-1);
  });

  it("should keep enforcing min and max", async () => {
    const prompt = new NumberPrompt({ message: "Num", min: 5, max: 10 });

    const promise = prompt.run();
    await delay(10);

    typeText("4");
    sendKey("\r");
    await delay(10);

    let resolved = false;
    promise.then(() => {
      resolved = true;
    });

    await delay(10);
    expect(resolved).toBe(false);
    expect(getOutput()).toContain("Minimum value is 5");

    sendKey("\x7f");
    typeText("12");
    sendKey("\r");
    await delay(10);
    expect(resolved).toBe(false);
    expect(getOutput()).toContain("Maximum value is 10");

    sendKey("\x7f");
    sendKey("\x7f");
    typeText("7");
    sendKey("\r");

    await expect(promise).resolves.toBe(7);
  });
});
