import { TablePrompt } from "../src/prompts/table";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sendKey = (key: string) => {
  process.stdin.emit("data", Buffer.from(key));
};

describe("TablePrompt", () => {
  let stdoutSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it("renders an empty table without crashing on navigation or Enter", async () => {
    const prompt = new TablePrompt({
      message: "Table",
      columns: ["Name"],
      data: [],
    });

    const promise = prompt.run();
    await delay(10);

    const output = stdoutSpy.mock.calls.map((call) => call[0]).join("");
    expect(output).toContain("No rows found");

    sendKey("\u001b[A"); // Up
    await delay(10);
    sendKey("\u001b[B"); // Down
    await delay(10);
    sendKey("\r"); // Enter must not submit or throw
    await delay(10);

    let settled = false;
    promise.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );
    await delay(10);
    expect(settled).toBe(false);

    sendKey("\u0003"); // Ctrl+C cancels the prompt
    await expect(promise).rejects.toThrow("User force closed");
  });

  it("still submits the selected row value", async () => {
    const prompt = new TablePrompt({
      message: "Table",
      columns: ["Name"],
      data: [
        { value: "alice", row: ["Alice"] },
        { value: "bob", row: ["Bob"] },
      ],
    });

    const promise = prompt.run();
    await delay(10);

    sendKey("\u001b[B"); // Down to Bob
    await delay(10);
    sendKey("\r");

    await expect(promise).resolves.toBe("bob");
  });
});
