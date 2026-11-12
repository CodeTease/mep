import { MultiColumnSelectPrompt } from "../src/prompts/multi-column-select";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sendKey = (key: string) => {
  process.stdin.emit("data", Buffer.from(key));
};

class FocusableMultiColumnSelectPrompt<V> extends MultiColumnSelectPrompt<V> {
  focusIndex(index: number) {
    this.selectedIndex = index;
  }
}

describe("MultiColumnSelectPrompt separators", () => {
  let stdoutSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it("skips a separator when moving down in a single column", async () => {
    const prompt = new MultiColumnSelectPrompt({
      message: "MCS",
      cols: 1,
      choices: [
        { title: "one", value: "one" },
        { separator: true },
        { title: "two", value: "two" },
      ],
    });

    const promise = prompt.run();
    await delay(10);

    sendKey("\u001b[B"); // Down
    await delay(10);
    sendKey("\r");

    expect(await promise).toBe("two");
  });

  it("keeps the column alignment when a separator occupies a grid cell", async () => {
    const prompt = new MultiColumnSelectPrompt({
      message: "MCS",
      cols: 2,
      choices: [
        { title: "one", value: "one" },
        { separator: true },
        { title: "two", value: "two" },
      ],
    });

    const promise = prompt.run();
    await delay(10);

    sendKey("\u001b[B"); // Down
    await delay(10);
    sendKey("\r");

    expect(await promise).toBe("two");
  });

  it("ignores Enter while a separator is highlighted", async () => {
    const prompt = new FocusableMultiColumnSelectPrompt({
      message: "MCS",
      cols: 1,
      choices: [{ separator: true }, { title: "one", value: "one" }],
    });

    const promise = prompt.run();
    await delay(10);

    prompt.focusIndex(0);
    sendKey("\r");
    await delay(10);

    let resolved = false;
    promise.then(() => {
      resolved = true;
    });
    await delay(10);
    expect(resolved).toBe(false);

    sendKey("\u001b[B"); // Down
    await delay(10);
    sendKey("\r");

    expect(await promise).toBe("one");
  });

  it("wraps horizontally to the last selectable choice", async () => {
    const prompt = new MultiColumnSelectPrompt({
      message: "MCS",
      cols: 1,
      choices: [
        { title: "one", value: "one" },
        { title: "two", value: "two" },
        { separator: true },
      ],
    });

    const promise = prompt.run();
    await delay(10);

    sendKey("\u001b[D"); // Left
    await delay(10);
    sendKey("\r");

    expect(await promise).toBe("two");
  });

  it("selects the first real choice after clearing the filter", async () => {
    const prompt = new MultiColumnSelectPrompt({
      message: "MCS",
      cols: 1,
      choices: [{ separator: true }, { title: "one", value: "one" }],
    });

    const promise = prompt.run();
    await delay(10);

    sendKey("o");
    await delay(10);
    sendKey("\x7f"); // Backspace clears the filter
    await delay(10);
    sendKey("\r");

    expect(await promise).toBe("one");
  });
});
