import { DataInspectorPrompt } from "../src/prompts/data-inspector";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sendKey = (key: string) => {
  process.stdin.emit("data", Buffer.from(key));
};

describe("DataInspectorPrompt", () => {
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

  it("renders an invalid Date safely and submits the data unchanged", async () => {
    const data = { when: new Date("nope") };
    const prompt = new DataInspectorPrompt({ message: "Inspect", data });

    const promise = prompt.run();
    await delay(10);

    expect(() => outputSoFar()).not.toThrow();
    expect(outputSoFar()).toContain("Invalid Date");

    sendKey("\r");
    await expect(promise).resolves.toBe(data);
    expect(Number.isNaN(data.when.getTime())).toBe(true);
  });

  it("still renders valid dates as ISO strings", async () => {
    const prompt = new DataInspectorPrompt({
      message: "Inspect",
      data: { when: new Date("2026-01-02T03:04:05.000Z") },
    });

    const promise = prompt.run();
    await delay(10);

    expect(outputSoFar()).toContain("2026-01-02T03:04:05.000Z");

    sendKey("\r");
    await promise;
  });
});
