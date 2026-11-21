import { SelectRangePrompt } from "../src/prompts/select-range";
import { stripAnsi } from "../src/utils";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sendKey = (key: string) => {
  process.stdin.emit("data", Buffer.from(key));
};

const UP = "\u001b[A";
const DOWN = "\u001b[B";

const choices = ["a", "b", "c", "d"].map((value) => ({ title: value, value }));

describe("SelectRangePrompt", () => {
  let stdoutSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  const rendered = (): string =>
    stripAnsi(stdoutSpy.mock.calls.map((call) => String(call[0])).join(""));

  it("keeps the anchored range when a filter is typed", async () => {
    const prompt = new SelectRangePrompt({ message: "r", choices });

    const promise = prompt.run();
    await delay(10);

    sendKey(" "); // anchor "a"
    await delay(10);
    sendKey(DOWN);
    await delay(10);
    sendKey(DOWN);
    await delay(10);
    sendKey(DOWN); // cursor on "d"
    await delay(10);
    sendKey("b"); // filter matches only "b"
    await delay(10);
    sendKey("\r");

    // The anchor is a choice, not a filtered position, so the whole anchored
    // range survives the filter instead of collapsing onto "b".
    await expect(promise).resolves.toEqual(["a", "b", "c", "d"]);
  });

  it("submits the anchored range even when the filter hides every choice", async () => {
    const prompt = new SelectRangePrompt({ message: "r", choices });

    const promise = prompt.run();
    await delay(10);

    sendKey(" "); // anchor "a"
    await delay(10);
    sendKey(DOWN); // cursor on "b"
    await delay(10);
    sendKey("zzz"); // no matches
    await delay(10);
    expect(rendered()).toContain("No results found");

    sendKey("\r");

    await expect(promise).resolves.toEqual(["a", "b"]);
  });

  it("submits the highlighted choice when nothing is anchored", async () => {
    const prompt = new SelectRangePrompt({ message: "r", choices });

    const promise = prompt.run();
    await delay(10);

    sendKey(DOWN);
    await delay(10);
    sendKey(DOWN); // cursor on "c"
    await delay(10);
    sendKey("\r");

    await expect(promise).resolves.toEqual(["c"]);
  });

  it("submits the anchored range after it is filtered and navigated", async () => {
    const prompt = new SelectRangePrompt({ message: "r", choices });

    const promise = prompt.run();
    await delay(10);

    sendKey(" "); // anchor "a"
    await delay(10);
    sendKey(DOWN);
    await delay(10);
    sendKey(DOWN); // cursor on "c"
    await delay(10);
    sendKey("c"); // filter matches only "c"
    await delay(10);
    sendKey("\r");

    await expect(promise).resolves.toEqual(["a", "b", "c"]);
  });

  it("moves the dragged endpoint with the cursor", async () => {
    const prompt = new SelectRangePrompt({ message: "r", choices });

    const promise = prompt.run();
    await delay(10);

    sendKey(DOWN);
    await delay(10);
    sendKey(DOWN); // cursor on "c"
    await delay(10);
    sendKey(" "); // anchor "c"
    await delay(10);
    sendKey(UP);
    await delay(10);
    sendKey(UP); // cursor on "a"
    await delay(10);
    sendKey("\r");

    await expect(promise).resolves.toEqual(["a", "b", "c"]);
  });

  it("submits the choice under the cursor when Space unanchors", async () => {
    const prompt = new SelectRangePrompt({ message: "r", choices });

    const promise = prompt.run();
    await delay(10);

    sendKey(" "); // anchor "a"
    await delay(10);
    sendKey(DOWN);
    await delay(10);
    sendKey(DOWN); // cursor on "c"
    await delay(10);
    sendKey(" "); // unanchor
    await delay(10);
    sendKey("\r");

    await expect(promise).resolves.toEqual(["c"]);
  });

  it("honours initial range indexes", async () => {
    const prompt = new SelectRangePrompt({
      message: "r",
      choices,
      initial: [1, 2],
    });

    const promise = prompt.run();
    await delay(10);
    sendKey("\r");

    await expect(promise).resolves.toEqual(["b", "c"]);
  });

  it("skips separators inside the anchored range", async () => {
    const prompt = new SelectRangePrompt({
      message: "r",
      choices: [
        { title: "a", value: "a" },
        { separator: true },
        { title: "b", value: "b" },
      ],
    });

    const promise = prompt.run();
    await delay(10);

    sendKey(" "); // anchor "a"
    await delay(10);
    sendKey(DOWN); // navigation skips the separator, cursor on "b"
    await delay(10);
    sendKey("\r");

    await expect(promise).resolves.toEqual(["a", "b"]);
  });
});
