import { TextPrompt } from "../src/prompts/text";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sendKey = (key: string) => {
  process.stdin.emit("data", Buffer.from(key));
};

describe("TextPrompt", () => {
  let stdoutSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it("should resolve with default empty string", async () => {
    const prompt = new TextPrompt({
      message: "Name?",
    });

    const promise = prompt.run();
    await delay(10);

    sendKey("\r");
    const result = await promise;
    expect(result).toBe("");
  });

  it("should resolve with provided initial value", async () => {
    const prompt = new TextPrompt({
      message: "Name?",
      initial: "Admin",
    });

    const promise = prompt.run();
    await delay(10);

    sendKey("\r");
    const result = await promise;
    expect(result).toBe("Admin");
  });

  it("should capture typed text", async () => {
    const prompt = new TextPrompt({
      message: "Name?",
    });

    const promise = prompt.run();
    await delay(10);

    sendKey("O");
    sendKey("k");
    await delay(10);

    sendKey("\r");
    const result = await promise;
    expect(result).toBe("Ok");
  });

  it("should handle backspace", async () => {
    const prompt = new TextPrompt({
      message: "Name?",
    });

    const promise = prompt.run();
    await delay(10);

    sendKey("A");
    sendKey("b");
    sendKey("\x7f"); // Backspace
    sendKey("c");
    await delay(10);

    sendKey("\r");
    const result = await promise;
    expect(result).toBe("Ac"); // "Ab" -> "A" -> "Ac"
  });

  it("should handle left and right arrows", async () => {
    const prompt = new TextPrompt({
      message: "Name?",
    });

    const promise = prompt.run();
    await delay(10);

    sendKey("a");
    sendKey("c");
    // move left
    sendKey("\x1b[D");
    // insert b
    sendKey("b");
    await delay(10);

    sendKey("\r");
    const result = await promise;
    expect(result).toBe("abc");
  });

  it("should validate input", async () => {
    const prompt = new TextPrompt({
      message: "Name?",
      validate: (val) => (val.length > 2 ? true : "Too short"),
    });

    const promise = prompt.run();
    await delay(10);

    sendKey("H");
    sendKey("i");
    await delay(10);
    sendKey("\r"); // Fails validation

    await delay(10);

    sendKey("!");
    await delay(10);
    sendKey("\r"); // Passes validation

    const result = await promise;
    expect(result).toBe("Hi!");
  });

  it("should submit the validated text when keys arrive while an async validator is pending", async () => {
    let validatedValue: string | undefined;
    let resolveValidation: (value: boolean) => void = () => {};

    const prompt = new TextPrompt({
      message: "Text",
      validate: (value) => {
        validatedValue = value;
        return new Promise((resolve) => {
          resolveValidation = resolve;
        });
      },
    });

    const promise = prompt.run();
    await delay(10);

    sendKey("o");
    sendKey("k");
    await delay(10);
    sendKey("\r"); // starts validating "ok"
    await delay(10);

    // Typed while the async validator is still in flight.
    sendKey("z");
    sendKey("z");
    await delay(10);

    let settled = false;
    promise.then(
      () => (settled = true),
      () => (settled = true),
    );
    expect(settled).toBe(false);

    resolveValidation(true);

    const result = await promise;
    expect(validatedValue).toBe("ok");
    expect(result).toBe("ok");
  });

  it("should ignore input while an async validator is pending", async () => {
    let resolveValidation: (value: boolean) => void = () => {};

    const prompt = new TextPrompt({
      message: "Text",
      validate: () =>
        new Promise((resolve) => {
          resolveValidation = resolve;
        }),
    });

    const promise = prompt.run();
    await delay(10);

    sendKey("o");
    sendKey("k");
    await delay(10);
    sendKey("\r");
    await delay(10);

    stdoutSpy.mockClear();
    sendKey("z");
    sendKey("z");
    sendKey("\x7f"); // Backspace
    sendKey("\x1b[D"); // Left arrow
    await delay(10);

    // Nothing typed (and no cursor movement) may be rendered while validating.
    const pendingOutput = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(pendingOutput).not.toContain("okzz");
    expect(pendingOutput).not.toContain("okz");

    resolveValidation(true);

    const result = await promise;
    expect(result).toBe("ok");
  });

  it("should keep the prompt open when an async validator returns an error and submit the re-validated text", async () => {
    const validatedValues: string[] = [];

    const prompt = new TextPrompt({
      message: "Text",
      validate: async (value) => {
        validatedValues.push(value);
        await delay(20);
        return value === "ok" || "must be ok";
      },
    });

    const promise = prompt.run();
    await delay(10);

    sendKey("n");
    sendKey("o");
    sendKey("\r"); // "no" fails validation
    await delay(60);

    let settled = false;
    promise.then(
      () => (settled = true),
      () => (settled = true),
    );
    expect(settled).toBe(false);

    const failureOutput = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(failureOutput).toContain("must be ok");

    sendKey("\x7f"); // remove "o"
    sendKey("\x7f"); // remove "n"
    sendKey("o");
    sendKey("k");
    await delay(10);
    sendKey("\r"); // "ok" passes validation

    const result = await promise;
    expect(validatedValues).toEqual(["no", "ok"]);
    expect(result).toBe("ok");
  });

  it("should surface an async validator rejection without submitting", async () => {
    const prompt = new TextPrompt({
      message: "Text",
      validate: async () => {
        await delay(10);
        throw new Error("Validator exploded");
      },
    });

    const promise = prompt.run();
    await delay(10);

    sendKey("o");
    sendKey("k");
    await delay(10);
    sendKey("\r");
    await delay(40);

    const output = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(output).toContain("Validator exploded");

    sendKey("\u0003");
    await expect(promise).rejects.toThrow("User force closed");
  });
});
