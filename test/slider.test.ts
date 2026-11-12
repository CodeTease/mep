import { SliderPrompt } from "../src/prompts/slider";
import { stripAnsi } from "../src/utils";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sendKey = (key: string) => {
  process.stdin.emit("data", Buffer.from(key));
};

describe("SliderPrompt", () => {
  let stdoutSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  // Returns the rendered track (text between the brackets) of the first frame.
  // Anchoring on the message avoids the cursor-control sequences that
  // stripAnsi leaves behind (it only removes SGR codes).
  const renderedBar = () => {
    const output = stripAnsi(
      stdoutSpy.mock.calls.map((call) => String(call[0])).join(""),
    );
    const line = output.split("\n").find((entry) => entry.includes("? Slider"));
    if (!line) return "";
    const open = line.indexOf("[", line.indexOf("? Slider"));
    return line.slice(open + 1, line.indexOf("]", open));
  };

  it("renders a handle when min equals max", async () => {
    const prompt = new SliderPrompt({ message: "Slider", min: 5, max: 5 });
    const promise = prompt.run();
    await delay(10);

    const bar = renderedBar();
    // The handle stays visible at the start even though the range is empty.
    expect(bar.indexOf("O")).toBe(0);
    // Exactly one handle is drawn.
    expect(bar.split("O")).toHaveLength(2);

    sendKey("\r");

    await expect(promise).resolves.toBe(5);
  });

  it("keeps the value fixed when min equals max", async () => {
    const prompt = new SliderPrompt({ message: "Slider", min: 5, max: 5 });
    const promise = prompt.run();
    await delay(10);

    sendKey("\u001b[C");
    await delay(10);
    sendKey("\u001b[D");
    await delay(10);
    sendKey("\r");

    await expect(promise).resolves.toBe(5);
  });

  it("positions the handle proportionally for a non-zero range", async () => {
    const prompt = new SliderPrompt({
      message: "Slider",
      min: 0,
      max: 10,
      initial: 5,
    });
    const promise = prompt.run();
    await delay(10);

    // 5 on a 0..10 range maps to the middle of the 20 character track.
    expect(renderedBar().indexOf("O")).toBe(10);

    sendKey("\r");

    await expect(promise).resolves.toBe(5);
  });
});
