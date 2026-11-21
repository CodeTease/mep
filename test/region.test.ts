import { RegionPrompt } from "../src/prompts/region";
import { stripAnsi } from "../src/utils";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sendKey = (key: string) => {
  process.stdin.emit("data", Buffer.from(key));
};

describe("RegionPrompt", () => {
  let stdoutSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutSpy = jest.spyOn(process.stdout, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it("renders the map without regions and rejects on submit", async () => {
    const prompt = new RegionPrompt({
      message: "Region",
      mapArt: "AB\nCD",
      regions: [],
    });

    const promise = prompt.run();
    await delay(10);

    const output = stripAnsi(stdoutSpy.mock.calls.map((call) => call[0]).join(""));
    expect(output).toContain("AB");
    expect(output).toContain("CD");
    expect(output).not.toContain("undefined");

    sendKey("\r");
    await expect(promise).rejects.toThrow("No regions available to select");
  });

  it("treats navigation as a no-op when there are no regions", async () => {
    const prompt = new RegionPrompt({
      message: "Region",
      mapArt: "AB\nCD",
      regions: [],
    });

    const promise = prompt.run();
    await delay(10);

    sendKey("\u001b[A"); // Up
    sendKey("\u001b[B"); // Down
    sendKey("\u001b[C"); // Right
    sendKey("\u001b[D"); // Left
    sendKey("\u001b[<64;10;10M"); // Scroll up
    sendKey("\u001b[<65;10;10M"); // Scroll down
    await delay(10);

    // Still running after navigation; submit to finish the prompt.
    sendKey("\r");
    await expect(promise).rejects.toThrow("No regions available to select");
  });
});
