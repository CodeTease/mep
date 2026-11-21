import { SlotPrompt } from "../src/prompts/slot";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sendKey = (key: string) => {
  process.stdin.emit("data", Buffer.from(key));
};

describe("SlotPrompt", () => {
  let stdoutSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutSpy = jest.spyOn(process.stdout, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it("renders an empty slot track and submits an empty result", async () => {
    const prompt = new SlotPrompt({ message: "Slot", choices: [] });

    const promise = prompt.run();
    await delay(10);

    const output = stdoutSpy.mock.calls.map((call) => call[0]).join("");
    expect(output).toContain("┌");
    expect(output).toContain("└");
    expect(output).not.toContain("undefined");

    sendKey("\r");
    await expect(promise).resolves.toBe("");
  });

  it("ignores spin keys when there are no choices", async () => {
    const prompt = new SlotPrompt({ message: "Slot", choices: [] });

    const promise = prompt.run();
    await delay(10);

    sendKey(" "); // Spin must be a no-op
    await delay(20);
    sendKey("\r");

    await expect(promise).resolves.toBe("");
  });
});
