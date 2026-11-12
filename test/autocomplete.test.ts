import { AutocompletePrompt } from "../src/prompts/autocomplete";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sendKey = (key: string) => {
  process.stdin.emit("data", Buffer.from(key));
};

describe("AutocompletePrompt", () => {
  let stdoutSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it("should resolve with the selected value", async () => {
    const prompt = new AutocompletePrompt({
      message: "Auto",
      suggest: async (input) => [
        { title: `one-${input}`, value: `one-${input}` },
      ],
    });

    const promise = prompt.run();
    await delay(400); // Initial search settles

    sendKey("a");
    await delay(400); // Debounced search settles

    sendKey("\r");
    const result = await promise;
    expect(result).toBe("one-a");
  });

  it("should not render after submission while a search is pending", async () => {
    const prompt = new AutocompletePrompt({
      message: "Auto",
      suggest: async () => [{ title: "one", value: "one" }],
    });

    const promise = prompt.run();
    await delay(400); // Initial search settles

    sendKey("a"); // Schedules a debounced search
    await delay(10);

    sendKey("\r");
    const result = await promise;
    expect(result).toBe("one");

    // Nothing should be written once the prompt has settled, even though the
    // debounced search is still scheduled to run.
    stdoutSpy.mockClear();
    await delay(400);
    expect(stdoutSpy).not.toHaveBeenCalled();
  });

  it("should not render after cancellation while a search is pending", async () => {
    const prompt = new AutocompletePrompt({
      message: "Auto",
      suggest: async () => [{ title: "one", value: "one" }],
    });

    const promise = prompt.run();
    await delay(400); // Initial search settles

    sendKey("a"); // Schedules a debounced search
    await delay(10);

    sendKey("\u0003"); // Ctrl+C
    await expect(promise).rejects.toThrow("User force closed");

    stdoutSpy.mockClear();
    await delay(400);
    expect(stdoutSpy).not.toHaveBeenCalled();
  });
});
