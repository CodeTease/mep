import { TransferPrompt } from "../src/prompts/transfer";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sendKey = (key: string) => {
  process.stdin.emit("data", Buffer.from(key));
};

const UP = "\u001b[A";
const DOWN = "\u001b[B";

describe("TransferPrompt", () => {
  let stdoutSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it("moves the highlighted item after the empty side is refilled", async () => {
    const prompt = new TransferPrompt({
      message: "t",
      source: ["a", "b", "c"],
      target: [],
    });

    const promise = prompt.run();
    await delay(10);

    sendKey("\t"); // switch to the empty target
    await delay(10);
    sendKey(DOWN); // must not leave the cursor at -1
    await delay(10);
    sendKey("a"); // move all items to the target
    await delay(10);
    sendKey(" "); // moves the first target item, not an unhighlighted one
    await delay(10);
    sendKey("\r");

    const result = await promise;
    // The old cursor of -1 made splice() remove "c", the item that was not
    // highlighted. The cursor is repaired to the first item instead.
    expect(result).toEqual([["a"], ["b", "c"]]);
  });

  it("moves the item at the cursor", async () => {
    const prompt = new TransferPrompt({
      message: "t",
      source: ["a", "b", "c"],
      target: ["z"],
    });

    const promise = prompt.run();
    await delay(10);

    sendKey(DOWN); // cursor on "b"
    await delay(10);
    sendKey(" ");
    await delay(10);
    sendKey("\r");

    await expect(promise).resolves.toEqual([
      ["a", "c"],
      ["z", "b"],
    ]);
  });

  it("keeps the cursor in range after a side is emptied and refilled", async () => {
    const prompt = new TransferPrompt({
      message: "t",
      source: ["a", "b"],
      target: [],
    });

    const promise = prompt.run();
    await delay(10);

    sendKey(DOWN); // cursor on "b"
    await delay(10);
    sendKey(" "); // move "b", cursor falls back to "a"
    await delay(10);
    sendKey(" "); // move "a", the source is empty now
    await delay(10);
    sendKey(UP); // no-op on an empty source
    await delay(10);
    sendKey(" "); // no-op on an empty source
    await delay(10);
    sendKey("\t"); // switch to the target, now holding both items
    await delay(10);
    sendKey(" "); // moves "b", the repaired cursor position
    await delay(10);
    sendKey("\r");

    await expect(promise).resolves.toEqual([["b"], ["a"]]);
  });

  it("ignores movement keys and Space while the active side is empty", async () => {
    const prompt = new TransferPrompt({
      message: "t",
      source: [],
      target: ["x"],
    });

    const promise = prompt.run();
    await delay(10);

    sendKey(DOWN);
    await delay(10);
    sendKey(UP);
    await delay(10);
    sendKey(" "); // nothing to move
    await delay(10);
    sendKey("\r");

    await expect(promise).resolves.toEqual([[], ["x"]]);
  });

  it("repairs the target cursor after moving all items left", async () => {
    const prompt = new TransferPrompt({
      message: "t",
      source: ["a"],
      target: ["x", "y"],
    });

    const promise = prompt.run();
    await delay(10);

    sendKey("\t"); // right
    await delay(10);
    sendKey(DOWN); // cursor on "y"
    await delay(10);
    sendKey("r"); // move all back to the source
    await delay(10);
    sendKey("\t"); // back to the right, now empty
    await delay(10);
    sendKey(DOWN);
    await delay(10);
    sendKey(" "); // no-op, the target is empty
    await delay(10);
    sendKey("\r");

    await expect(promise).resolves.toEqual([["a", "x", "y"], []]);
  });
});
