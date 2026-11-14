import { ListPrompt } from "../src/prompts/list";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sendKey = (key: string) => {
  process.stdin.emit("data", Buffer.from(key));
};

describe("ListPrompt", () => {
  let stdoutSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it("should await an async validate callback before submitting", async () => {
    let validatedValue: string[] | undefined;
    const prompt = new ListPrompt({
      message: "Tags",
      validate: async (value) => {
        await delay(20);
        validatedValue = value;
        return true;
      },
    });

    const promise = prompt.run();
    await delay(10);

    sendKey("a");
    sendKey("\r"); // add "a"
    await delay(10);
    sendKey("\r"); // empty input: validate and submit

    const result = await promise;
    expect(result).toEqual(["a"]);
    expect(validatedValue).toEqual(["a"]);
  });

  it("should not submit while an async validator is pending and ignore input until it settles", async () => {
    let resolveValidation: (value: boolean) => void = () => {};
    let validatedValue: string[] | undefined;

    const prompt = new ListPrompt({
      message: "Tags",
      validate: (value) => {
        validatedValue = [...value];
        return new Promise((resolve) => {
          resolveValidation = resolve;
        });
      },
    });

    const promise = prompt.run();
    await delay(10);

    sendKey("a");
    sendKey("\r");
    await delay(10);
    sendKey("\r"); // starts validation
    await delay(10);

    // Input while validation is in flight must be ignored.
    sendKey("b");
    sendKey("\r");
    await delay(10);

    let settled = false;
    promise.then(
      () => (settled = true),
      () => (settled = true),
    );
    expect(settled).toBe(false);

    resolveValidation(true);

    const result = await promise;
    expect(result).toEqual(["a"]);
    expect(validatedValue).toEqual(["a"]);
  });

  it("should surface an error string from an async validator without submitting", async () => {
    const prompt = new ListPrompt({
      message: "Tags",
      validate: async () => {
        await delay(20);
        return "Add at least one tag";
      },
    });

    const promise = prompt.run();
    await delay(10);

    sendKey("\r");

    let settled = false;
    promise.then(
      () => (settled = true),
      () => (settled = true),
    );
    await delay(60);
    expect(settled).toBe(false);

    const output = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(output).toContain("Add at least one tag");

    sendKey("\u0003");
    await expect(promise).rejects.toThrow("User force closed");
  });

  it("should render an error when an async validator throws", async () => {
    const prompt = new ListPrompt({
      message: "Tags",
      validate: async () => {
        await delay(10);
        throw new Error("Validator exploded");
      },
    });

    const promise = prompt.run();
    await delay(10);

    sendKey("\r");
    await delay(40);

    const output = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(output).toContain("Validator exploded");

    sendKey("\u0003");
    await expect(promise).rejects.toThrow("User force closed");
  });

  it("should keep supporting synchronous validators", async () => {
    const prompt = new ListPrompt({
      message: "Tags",
      initial: ["kept"],
      validate: (value) => value.length > 0,
    });

    const promise = prompt.run();
    await delay(10);

    sendKey("\r");

    await expect(promise).resolves.toEqual(["kept"]);
  });
});
