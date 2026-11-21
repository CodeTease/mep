import { TimePrompt } from "../src/prompts/time";
import { stripAnsi } from "../src/utils";

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

  it("should honor a 12-hour string initial value", async () => {
    const prompt = new TimePrompt({ message: "Time", initial: "07:00 AM" });

    const promise = prompt.run();
    await delay(10);
    sendKey("\r");

    await expect(promise).resolves.toBe("07:00");
  });

  it("should honor a 24-hour string initial value", async () => {
    const prompt = new TimePrompt({ message: "Time", initial: "14:30" });

    const promise = prompt.run();
    await delay(10);
    sendKey("\r");

    await expect(promise).resolves.toBe("14:30");
  });

  it("should parse a single-digit hour and a lowercase meridiem", async () => {
    const prompt = new TimePrompt({ message: "Time", initial: "7:05 pm" });

    const promise = prompt.run();
    await delay(10);
    sendKey("\r");

    await expect(promise).resolves.toBe("19:05");
  });

  it("should format a 12-hour string initial value as 12h", async () => {
    const prompt = new TimePrompt({ message: "Time", format: "12h", initial: "12:00 AM" });

    const promise = prompt.run();
    await delay(10);
    sendKey("\r");

    await expect(promise).resolves.toBe("12:00 AM");
  });

  it("should still accept ISO datetime strings", async () => {
    const prompt = new TimePrompt({ message: "Time", initial: "2026-01-01T09:45:00" });

    const promise = prompt.run();
    await delay(10);
    sendKey("\r");

    await expect(promise).resolves.toBe("09:45");
  });

  it("should render previews that match the selected minute for steps larger than 60", async () => {
    const prompt = new TimePrompt({
      message: "Time",
      step: 67,
      initial: "2026-01-01T00:00:00",
    });

    const promise = prompt.run();
    await delay(10);

    const initialRender = stripAnsi(
      stdoutSpy.mock.calls.map((call) => String(call[0])).join(""),
    );

    // Previous preview wraps to 53 and next preview wraps to 07, matching
    // the values the prompt selects when the minutes column is adjusted.
    expect(initialRender).toContain("53");
    expect(initialRender).toContain("07");
    expect(initialRender).not.toContain("-7");

    sendKey("\u001b[C");
    await delay(10);

    // Selecting the next value (0 + 67) wraps to 7.
    sendKey("\u001b[B");
    await delay(10);

    sendKey("\r");

    await expect(promise).resolves.toBe("00:07");
  });
});
