import { SortGridPrompt } from "../src/prompts/sort-grid";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sendKey = (key: string) => {
  process.stdin.emit("data", Buffer.from(key));
};

const UP = "\u001b[A";
const DOWN = "\u001b[B";
const RIGHT = "\u001b[C";
const LEFT = "\u001b[D";

describe("SortGridPrompt", () => {
  let stdoutSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it("preserves occupied cells when moving through an empty row", async () => {
    const prompt = new SortGridPrompt({
      message: "g",
      data: [["x", "y", "z"], [], ["p", "q"]],
    });

    const promise = prompt.run();
    await delay(10);

    sendKey(DOWN); // empty row
    await delay(10);
    sendKey(RIGHT); // must not move to -1
    await delay(10);
    sendKey(UP); // back on the first row
    await delay(10);
    sendKey(" "); // grab "x"
    await delay(10);
    sendKey(RIGHT); // swap with "y"
    await delay(10);
    sendKey("\r");

    const result = await promise;
    expect(result).toEqual([["y", "x", "z"], [], ["p", "q"]]);
    expect(result.flat()).not.toContain(undefined);
  });

  it("does not grab or swap cells on an empty row", async () => {
    const prompt = new SortGridPrompt({
      message: "g",
      data: [["x", "y"], [], ["p", "q"]],
    });

    const promise = prompt.run();
    await delay(10);

    sendKey(DOWN); // empty row
    await delay(10);
    sendKey(" "); // grab is a no-op, there is no cell
    await delay(10);
    sendKey(DOWN); // next row
    await delay(10);
    sendKey(RIGHT); // move within "p", nothing is held
    await delay(10);

    sendKey("\r");

    const result = await promise;
    expect(result).toEqual([["x", "y"], [], ["p", "q"]]);
  });

  it("drops the held cell when the grab is released on an empty row", async () => {
    const prompt = new SortGridPrompt({
      message: "g",
      data: [["x", "y"], [], ["p", "q"]],
    });

    const promise = prompt.run();
    await delay(10);

    sendKey(RIGHT); // cursor on "y"
    await delay(10);
    sendKey(" "); // grab "y"
    await delay(10);
    sendKey(DOWN); // empty row: no cell to swap with
    await delay(10);
    sendKey(" "); // release the grab
    await delay(10);
    sendKey(DOWN); // third row
    await delay(10);

    sendKey("\r");

    const result = await promise;
    expect(result).toEqual([["x", "y"], [], ["p", "q"]]);
    expect(result.flat()).not.toContain(undefined);
  });

  it("keeps holding the cell while moving over an empty row", async () => {
    const prompt = new SortGridPrompt({
      message: "g",
      data: [["x", "y"], [], ["p", "q"]],
    });

    const promise = prompt.run();
    await delay(10);

    sendKey(RIGHT); // cursor on "y"
    await delay(10);
    sendKey(" "); // grab "y"
    await delay(10);
    sendKey(DOWN); // empty row: nothing is swapped
    await delay(10);
    sendKey(DOWN); // third row: swaps with "p"
    await delay(10);

    sendKey("\r");

    const result = await promise;
    expect(result).toEqual([["x", "p"], [], ["y", "q"]]);
    expect(result.flat()).not.toContain(undefined);
  });

  it("swaps cells across rows", async () => {
    const prompt = new SortGridPrompt({
      message: "g",
      data: [
        ["a", "b"],
        ["c", "d"],
      ],
    });

    const promise = prompt.run();
    await delay(10);

    sendKey(" "); // grab "a"
    await delay(10);
    sendKey(DOWN); // swap with "c"
    await delay(10);
    sendKey("\r");

    await expect(promise).resolves.toEqual([
      ["c", "b"],
      ["a", "d"],
    ]);
  });

  it("clamps horizontal movement to the current row", async () => {
    const prompt = new SortGridPrompt({
      message: "g",
      data: [["a", "b"], ["c"]],
    });

    const promise = prompt.run();
    await delay(10);

    sendKey(RIGHT); // cursor on "b"
    await delay(10);
    sendKey(DOWN); // second row only has "c"
    await delay(10);
    sendKey(RIGHT); // stays on "c"
    await delay(10);
    sendKey(" "); // grab "c"
    await delay(10);
    sendKey(RIGHT); // stays on "c", no swap
    await delay(10);
    sendKey("\r");

    await expect(promise).resolves.toEqual([["a", "b"], ["c"]]);
  });
});
