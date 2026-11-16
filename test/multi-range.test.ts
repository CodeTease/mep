import { MultiRangePrompt } from "../src/prompts/multi-range";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sendKey = (key: string) => {
  process.stdin.emit("data", Buffer.from(key));
};

const DOWN = "\u001b[B";

describe("MultiRangePrompt", () => {
  let stdoutSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  const choices = ["alpha", "beta", "gamma", "delta"].map((value) => ({
    title: value,
    value,
  }));

  it("should resolve with the current choice when nothing was committed", async () => {
    const prompt = new MultiRangePrompt({ message: "MR", choices });

    const promise = prompt.run();
    await delay(10);

    sendKey("\r");

    await expect(promise).resolves.toEqual(["alpha"]);
  });

  it("should keep committed ranges when the filter changes", async () => {
    const prompt = new MultiRangePrompt({ message: "MR", choices });

    const promise = prompt.run();
    await delay(10);

    sendKey(" "); // anchor alpha
    await delay(10);
    sendKey(DOWN);
    await delay(10);
    sendKey(DOWN); // cursor on gamma
    await delay(10);
    sendKey(" "); // commit alpha..gamma
    await delay(10);

    sendKey("delta"); // filter hides the committed range
    await delay(10);

    sendKey("\r");

    await expect(promise).resolves.toEqual(["alpha", "beta", "gamma"]);
  });

  it("should resolve committed ranges even when the filter hides some of them", async () => {
    const prompt = new MultiRangePrompt({ message: "MR", choices });

    const promise = prompt.run();
    await delay(10);

    sendKey(DOWN); // cursor on beta
    await delay(10);
    sendKey(" "); // anchor beta
    await delay(10);
    sendKey(DOWN); // cursor on gamma
    await delay(10);
    sendKey(" "); // commit beta..gamma
    await delay(10);

    sendKey("el"); // only delta survives the filter
    await delay(10);

    sendKey("\r");

    await expect(promise).resolves.toEqual(["beta", "gamma"]);
  });

  it("should submit committed ranges when the filter matches nothing", async () => {
    const prompt = new MultiRangePrompt({ message: "MR", choices });

    const promise = prompt.run();
    await delay(10);

    sendKey(" "); // anchor alpha
    await delay(10);
    sendKey(DOWN);
    await delay(10);
    sendKey(DOWN); // cursor on gamma
    await delay(10);
    sendKey(" "); // commit alpha..gamma
    await delay(10);

    sendKey("zzz"); // no matches
    await delay(10);

    sendKey("\r");

    await expect(promise).resolves.toEqual(["alpha", "beta", "gamma"]);
  });

  it("should submit multiple committed ranges in choice order", async () => {
    const prompt = new MultiRangePrompt({ message: "MR", choices });

    const promise = prompt.run();
    await delay(10);

    sendKey(DOWN); // beta
    await delay(10);
    sendKey(DOWN); // gamma
    await delay(10);
    sendKey(DOWN); // delta
    await delay(10);
    sendKey(" "); // anchor delta
    await delay(10);
    sendKey(" "); // commit delta
    await delay(10);

    sendKey("\u001b[A"); // up to gamma
    await delay(10);
    sendKey("\u001b[A"); // up to beta
    await delay(10);
    sendKey("\u001b[A"); // up to alpha
    await delay(10);
    sendKey(" "); // anchor alpha
    await delay(10);
    sendKey(" "); // commit alpha
    await delay(10);

    sendKey("\r");

    await expect(promise).resolves.toEqual(["alpha", "delta"]);
  });

  it("should map ranges committed while filtering back to the choice list", async () => {
    const prompt = new MultiRangePrompt({ message: "MR", choices });

    const promise = prompt.run();
    await delay(10);

    sendKey("ta"); // filter matches beta and delta
    await delay(10);
    sendKey(" "); // anchor beta
    await delay(10);
    sendKey(DOWN); // cursor on delta
    await delay(10);
    sendKey(" "); // commit the range between them
    await delay(10);

    sendKey("\r");

    await expect(promise).resolves.toEqual(["beta", "gamma", "delta"]);
  });

  it("should skip separators inside committed ranges", async () => {
    const prompt = new MultiRangePrompt({
      message: "MR",
      choices: [
        { title: "alpha", value: "alpha" },
        { separator: true },
        { title: "beta", value: "beta" },
        { title: "gamma", value: "gamma" },
      ],
    });

    const promise = prompt.run();
    await delay(10);

    sendKey(" "); // anchor alpha
    await delay(10);
    sendKey(DOWN); // navigation skips the separator, cursor on beta
    await delay(10);
    sendKey(" "); // commit alpha..beta (includes the separator)
    await delay(10);

    sendKey("\r");

    await expect(promise).resolves.toEqual(["alpha", "beta"]);
  });
});
