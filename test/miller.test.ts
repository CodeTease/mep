import { MillerPrompt } from "../src/prompts/miller";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sendKey = (key: string) => {
  process.stdin.emit("data", Buffer.from(key));
};

describe("MillerPrompt", () => {
  let stdoutSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutSpy = jest.spyOn(process.stdout, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it("renders and submits an empty selection for empty data", async () => {
    const prompt = new MillerPrompt<string>({ message: "Miller", data: [] });

    const promise = prompt.run();
    await delay(10);

    const output = stdoutSpy.mock.calls.map((call) => call[0]).join("");
    expect(output).toContain("Path:");
    expect(output).not.toContain("undefined");

    sendKey("\r");
    await expect(promise).resolves.toEqual([]);
  });

  it("does not crash on navigation when data is empty", async () => {
    const prompt = new MillerPrompt<string>({ message: "Miller", data: [] });

    const promise = prompt.run();
    await delay(10);

    sendKey("\u001b[A"); // Up
    sendKey("\u001b[B"); // Down
    sendKey("\u001b[C"); // Right
    sendKey("\u001b[D"); // Left
    sendKey("\t"); // Tab
    await delay(10);

    sendKey("\r");
    await expect(promise).resolves.toEqual([]);
  });
});
