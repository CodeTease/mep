import { MatchPrompt } from "../src/prompts/match";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sendKey = (key: string) => {
  process.stdin.emit("data", Buffer.from(key));
};

describe("MatchPrompt", () => {
  let stdoutSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it("ignores Space on an empty source list", async () => {
    const prompt = new MatchPrompt({
      message: "Match",
      source: [],
      target: ["a"],
    });

    const promise = prompt.run();
    await delay(10);

    expect(() => sendKey(" ")).not.toThrow();
    await delay(10);

    sendKey("\r");
    expect(await promise).toEqual({});
  });

  it("ignores Space and vertical navigation on an empty target list", async () => {
    const prompt = new MatchPrompt({
      message: "Match",
      source: ["a"],
      target: [],
    });

    const promise = prompt.run();
    await delay(10);

    sendKey(" "); // Pick the only source item.
    await delay(10);

    expect(() => sendKey(" ")).not.toThrow(); // Linking has no target.
    expect(() => sendKey("\u001b[B")).not.toThrow(); // Down
    expect(() => sendKey("\u001b[A")).not.toThrow(); // Up
    await delay(10);

    sendKey("\r");
    expect(await promise).toEqual({});
  });

  it("resolves with an empty result when both lists are empty", async () => {
    const prompt = new MatchPrompt({
      message: "Match",
      source: [],
      target: [],
    });

    const promise = prompt.run();
    await delay(10);

    expect(() => sendKey("\u001b[B")).not.toThrow();
    sendKey("\r");

    expect(await promise).toEqual({});
  });

  it("still links a picked source to a target", async () => {
    const prompt = new MatchPrompt({
      message: "Match",
      source: ["a"],
      target: ["x", "y"],
    });

    const promise = prompt.run();
    await delay(10);

    sendKey(" "); // Pick source "a".
    await delay(10);
    sendKey("\u001b[B"); // Move to target "y".
    await delay(10);
    sendKey(" "); // Link "a" -> "y".
    sendKey("\r");

    expect(await promise).toEqual({ a: ["y"] });
  });
});
