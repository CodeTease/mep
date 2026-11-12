import { ANSI } from "../src/ansi";
import { CheckboxPrompt } from "../src/prompts/checkbox";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sendKey = (key: string) => {
  process.stdin.emit("data", Buffer.from(key));
};

describe("CheckboxPrompt", () => {
  let stdoutSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  const captureOutput = (): string[] => {
    const writes: string[] = [];
    stdoutSpy.mockImplementation((chunk: any) => {
      writes.push(String(chunk));
      return true;
    });
    return writes;
  };

  it("should resolve with the checked values", async () => {
    captureOutput();
    const prompt = new CheckboxPrompt({
      message: "Pick",
      choices: [
        { title: "a", value: "a" },
        { title: "b", value: "b" },
      ],
    });

    const promise = prompt.run();
    await delay(10);

    sendKey(" "); // check "a"
    await delay(10);
    sendKey("\r");

    const result = await promise;
    expect(result).toEqual(["a"]);
  });

  it("should terminate the prompt line when submitting", async () => {
    const writes = captureOutput();
    const prompt = new CheckboxPrompt({
      message: "Pick",
      choices: [{ title: "a", value: "a" }],
    });

    const promise = prompt.run();
    await delay(10);

    sendKey(" ");
    await delay(10);
    sendKey("\r");
    await promise;

    // cleanup() writes SHOW_CURSOR followed by submit()'s newline.
    expect(writes.slice(-2)).toEqual([ANSI.SHOW_CURSOR, "\n"]);
  });

  it("should terminate the prompt line when submitting with no selections", async () => {
    const writes = captureOutput();
    const prompt = new CheckboxPrompt({
      message: "Pick",
      choices: [{ title: "a", value: "a" }],
    });

    const promise = prompt.run();
    await delay(10);

    sendKey("\r");

    const result = await promise;
    expect(result).toEqual([]);
    expect(writes.slice(-2)).toEqual([ANSI.SHOW_CURSOR, "\n"]);
  });

  it("should not submit while the minimum selection is not met", async () => {
    captureOutput();
    const prompt = new CheckboxPrompt({
      message: "Pick",
      min: 1,
      choices: [{ title: "a", value: "a" }],
    });

    const promise = prompt.run();
    await delay(10);

    sendKey("\r");
    await delay(10);

    let resolved = false;
    promise.then(() => {
      resolved = true;
    });
    await delay(10);
    expect(resolved).toBe(false);

    sendKey(" ");
    await delay(10);
    sendKey("\r");

    const result = await promise;
    expect(result).toEqual(["a"]);
  });
});
