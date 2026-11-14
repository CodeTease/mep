import { FormPrompt } from "../src/prompts/form";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sendKey = (key: string) => {
  process.stdin.emit("data", Buffer.from(key));
};

describe("FormPrompt", () => {
  let stdoutSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it("should move focus forward with Tab", async () => {
    const prompt = new FormPrompt({
      message: "Form",
      fields: [
        { name: "first", message: "First" },
        { name: "last", message: "Last" },
      ],
    });

    const promise = prompt.run();
    await delay(10);

    sendKey("x");
    sendKey("\t"); // Tab
    await delay(10);
    sendKey("y");
    await delay(10);

    // The first Enter submits from the last field. The second one keeps the
    // test terminating if Tab regresses to moving backwards.
    sendKey("\r");
    await delay(10);
    sendKey("\r");

    await expect(promise).resolves.toEqual({ first: "x", last: "y" });
  });

  it("should move focus backwards with Shift+Tab", async () => {
    const prompt = new FormPrompt({
      message: "Form",
      fields: [
        { name: "first", message: "First" },
        { name: "middle", message: "Middle" },
        { name: "last", message: "Last" },
      ],
    });

    const promise = prompt.run();
    await delay(10);

    sendKey("a");
    sendKey("\t"); // Tab -> middle
    await delay(10);
    sendKey("b");
    sendKey("\u001b[Z"); // Shift+Tab -> first
    await delay(10);
    sendKey("c");
    await delay(10);

    sendKey("\r"); // first -> middle
    await delay(10);
    sendKey("\r"); // middle -> last
    await delay(10);
    sendKey("\r"); // submit

    await expect(promise).resolves.toEqual({
      first: "ac",
      middle: "b",
      last: "",
    });
  });

  it("should surface a validator error thrown during submit", async () => {
    let calls = 0;
    const prompt = new FormPrompt({
      message: "Form",
      fields: [
        {
          name: "a",
          message: "A",
          initial: "value",
          validate: () => {
            calls++;
            // Passes while validating the field, then throws when submitForm
            // validates every field again.
            if (calls > 1) throw new Error("boom");
            return true;
          },
        },
      ],
    });

    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => unhandled.push(reason);
    process.on("unhandledRejection", onUnhandled);

    const promise = prompt.run();
    await delay(10);

    sendKey("\r");
    await delay(20);

    process.removeListener("unhandledRejection", onUnhandled);

    expect(calls).toBe(2);
    expect(unhandled).toEqual([]);

    const output = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(output).toContain("boom");
    expect(output).toContain("Please fix errors before submitting.");

    sendKey("\u0003"); // Ctrl+C
    await expect(promise).rejects.toThrow("User force closed");
  });

  it("should render and submit a form with no fields", async () => {
    const prompt = new FormPrompt({ message: "Form", fields: [] });

    const promise = prompt.run();
    await delay(10);

    // Typing and navigation are no-ops with no active field.
    expect(() => sendKey("x")).not.toThrow();
    sendKey("\u001b[B"); // Down
    await delay(10);

    sendKey("\r");
    await expect(promise).resolves.toEqual({});
  });
});
