import { TimePrompt } from "../src/prompts/time";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sendKey = (key: string) => {
  process.stdin.emit("data", Buffer.from(key));
};

describe("TimePrompt", () => {
  let stdoutSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it("should wrap minute underflow back onto the step grid", async () => {
    const prompt = new TimePrompt({
      message: "Time",
      step: 7,
      initial: "2026-01-01T00:00:00",
    });

    const promise = prompt.run();
    await delay(10);

    // Move focus to the minutes column.
    sendKey("\u001b[C");
    await delay(10);

    // Decrement nine times: 0, 53, 46, 39, 32, 25, 18, 11, 4, then wrap to 57.
    for (let i = 0; i < 9; i++) {
      sendKey("\u001b[A");
    }
    await delay(10);

    sendKey("\r");

    await expect(promise).resolves.toBe("00:57");
  });

  it("should wrap minute overflow back onto the step grid", async () => {
    const prompt = new TimePrompt({
      message: "Time",
      step: 7,
      initial: "2026-01-01T00:56:00",
    });

    const promise = prompt.run();
    await delay(10);

    sendKey("\u001b[C");
    await delay(10);

    // 56 + 7 wraps to 3 so the minute stays on the step grid.
    sendKey("\u001b[B");
    await delay(10);

    sendKey("\r");

    await expect(promise).resolves.toBe("00:03");
  });
});
