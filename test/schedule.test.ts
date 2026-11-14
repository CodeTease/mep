import { SchedulePrompt } from "../src/prompts/schedule";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sendKey = (key: string) => {
  process.stdin.emit("data", Buffer.from(key));
};

describe("SchedulePrompt", () => {
  let stdoutSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  const outputSoFar = () =>
    stdoutSpy.mock.calls.map((call: unknown[]) => String(call[0])).join("");

  it("renders an empty timeline without Infinity or NaN values", async () => {
    const prompt = new SchedulePrompt({ message: "Sched", data: [] });

    const promise = prompt.run();
    await delay(10);

    const output = outputSoFar();
    expect(output).toContain("No tasks scheduled");
    expect(output).not.toContain("Infinity");
    expect(output).not.toContain("NaN");

    sendKey("\r");
    await expect(promise).resolves.toEqual([]);
  });

  it("ignores movement keys when data is empty and still resolves on Enter", async () => {
    const prompt = new SchedulePrompt({ message: "Sched", data: [] });

    const promise = prompt.run();
    await delay(10);

    sendKey("\u001b[C"); // Right
    sendKey("\u001b[D"); // Left
    sendKey("\u001b[A"); // Up
    sendKey("\u001b[B"); // Down
    sendKey("\t"); // Tab
    sendKey("\u001b[Z"); // Shift+Tab
    sendKey("h");
    sendKey("l");
    await delay(10);

    sendKey("\r");
    await expect(promise).resolves.toEqual([]);
  });

  it("ignores mouse scrolling when data is empty", async () => {
    const prompt = new SchedulePrompt({ message: "Sched", data: [] });

    const promise = prompt.run();
    await delay(10);

    sendKey("\u001b[<64;20;10M"); // Scroll up
    sendKey("\u001b[<65;20;10M"); // Scroll down
    await delay(10);

    sendKey("\r");
    await expect(promise).resolves.toEqual([]);
  });

  it("resolves with the task list on Enter", async () => {
    const start = new Date("2026-01-01T09:00:00Z");
    const end = new Date("2026-01-01T10:00:00Z");
    const prompt = new SchedulePrompt({
      message: "Sched",
      data: [{ name: "Meeting", start, end }],
    });

    const promise = prompt.run();
    await delay(10);

    sendKey("\r");
    await expect(promise).resolves.toEqual([{ name: "Meeting", start, end }]);
  });

  it("moves the selected task with the arrow keys", async () => {
    const start = new Date("2026-01-01T09:00:00Z");
    const end = new Date("2026-01-01T10:00:00Z");
    const prompt = new SchedulePrompt({
      message: "Sched",
      data: [{ name: "Meeting", start, end }],
    });

    const promise = prompt.run();
    await delay(10);

    sendKey("\u001b[C"); // Right
    await delay(10);
    sendKey("\r");

    const [task] = await promise;
    expect(task.start.getTime()).toBeGreaterThan(start.getTime());
    expect(task.end.getTime()).toBeGreaterThan(end.getTime());
  });
});
