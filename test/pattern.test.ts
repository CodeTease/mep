import { PatternPrompt } from "../src/prompts/pattern";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sendKey = (key: string) => {
  process.stdin.emit("data", Buffer.from(key));
};

// SGR mouse: ESC [ < b ; x ; y M (press/motion) or m (release).
const motion = (x: number, y: number) => `\x1b[<35;${x};${y}M`;
const dragMotion = (x: number, y: number) => `\x1b[<32;${x};${y}M`;
const press = (x: number, y: number) => `\x1b[<0;${x};${y}M`;
const release = (x: number, y: number) => `\x1b[<0;${x};${y}m`;

const state = (prompt: PatternPrompt) =>
  prompt as unknown as { isDragging: boolean; path: number[] };

describe("PatternPrompt mouse drawing", () => {
  let stdoutSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it("collects a path when the drag starts after mouse motion", async () => {
    const prompt = new PatternPrompt({ message: "Pattern" });

    const promise = prompt.run();
    await delay(10);

    sendKey(motion(10, 5));
    await delay(10);
    sendKey(press(10, 5));
    await delay(10);

    expect(state(prompt).isDragging).toBe(true);

    sendKey(dragMotion(14, 5));
    await delay(10);
    sendKey(release(14, 5));

    await expect(promise).resolves.toEqual([0, 1]);
    expect(state(prompt).path).toEqual([0, 1]);
  });

  it("still collects a path when the drag starts without prior motion", async () => {
    const prompt = new PatternPrompt({ message: "Pattern" });

    const promise = prompt.run();
    await delay(10);

    sendKey(press(10, 5));
    await delay(10);
    sendKey(dragMotion(14, 5));
    await delay(10);
    sendKey(release(14, 5));

    await expect(promise).resolves.toEqual([0, 1]);
  });

  it("does not start a drag on motion events alone", async () => {
    const prompt = new PatternPrompt({ message: "Pattern" });

    const promise = prompt.run();
    await delay(10);

    sendKey(motion(10, 5));
    sendKey(motion(14, 5));
    sendKey(dragMotion(14, 9));
    await delay(10);

    expect(state(prompt).isDragging).toBe(false);
    expect(state(prompt).path).toEqual([]);

    // A subsequent press must still start a fresh drag. The motions above
    // moved the cursor to row 1, column 1.
    sendKey(press(14, 9));
    await delay(10);

    expect(state(prompt).isDragging).toBe(true);
    expect(state(prompt).path).toEqual([4]);

    sendKey("\u0003");
    await expect(promise).rejects.toThrow("User force closed");
  });
});
