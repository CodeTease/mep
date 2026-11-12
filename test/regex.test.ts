import { RegexPrompt } from "../src/prompts/regex";
import { symbols } from "../src/symbols";
import { stripAnsi } from "../src/utils";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sendKey = (key: string) => {
  process.stdin.emit("data", Buffer.from(key));
};

// Tests run without a TTY, so the ASCII symbol set is active.
const TICK = symbols.tick;
const CROSS = symbols.cross;

describe("RegexPrompt", () => {
  let stdoutSpy: jest.SpyInstance;
  let writes: string[];

  beforeEach(() => {
    writes = [];
    stdoutSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation((chunk: any) => {
        writes.push(String(chunk));
        return true;
      });
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  // Everything printed after the given write index, without colour codes.
  const outputSince = (index: number) =>
    stripAnsi(writes.slice(index).join(""));

  // Indicator symbols rendered directly in front of a test case. The leading
  // whitespace keeps the header icon and the echoed input from matching (the
  // ASCII cross is "x", which also appears inside words).
  const indicatorsFor = (output: string, testCase: string) =>
    Array.from(
      output.matchAll(
        new RegExp(`\\s([${TICK}${CROSS}])\\s+${testCase}(?![\\w])`, "g"),
      ),
    ).map((entry) => entry[1]);

  const type = async (text: string) => {
    for (const char of text) {
      sendKey(char);
      await delay(10);
    }
  };

  it("reports identical test cases consistently with the global flag", async () => {
    const prompt = new RegexPrompt({
      message: "Pattern",
      tests: ["aa", "aa"],
      flags: "g",
    });
    const promise = prompt.run();
    await delay(10);

    await type("a");

    // The pattern becomes /aa/g on this keystroke. Both identical cases match,
    // so no cross may be rendered even though `test()` is stateful for /g.
    const mark = writes.length;
    await type("a");

    expect(outputSince(0)).toContain(TICK);
    expect(indicatorsFor(outputSince(mark), "aa")).not.toContain(CROSS);

    sendKey("\r");
    const result = await promise;
    expect(result.source).toBe("aa");
    expect(result.flags).toBe("g");
  });

  it("keeps indicators stable across re-renders with a stateful flag", async () => {
    const prompt = new RegexPrompt({
      message: "Pattern",
      tests: ["aaa"],
      flags: "g",
    });
    const promise = prompt.run();
    await delay(10);

    await type("a");

    // Moving the cursor re-renders without changing the pattern. Every render
    // matches the same case, so a stateful lastIndex that survives renders
    // eventually walks past the end of the string and reports a false negative.
    sendKey("\u001b[D");
    await delay(10);
    sendKey("\u001b[C");
    await delay(10);

    const mark = writes.length;
    sendKey("\u001b[D");
    await delay(10);

    expect(indicatorsFor(outputSince(mark), "aaa")).not.toContain(CROSS);

    sendKey("\r");
    await expect(promise).resolves.toBeInstanceOf(RegExp);
  });

  it("returns a regex without leaked lastIndex state", async () => {
    const prompt = new RegexPrompt({
      message: "Pattern",
      tests: ["aa"],
      flags: "g",
    });
    const promise = prompt.run();
    await delay(10);

    // Rendering the single test case leaves lastIndex at 1 for /a/g.
    await type("a");
    sendKey("\r");

    const result = await promise;
    expect(result.lastIndex).toBe(0);
  });

  it("still flags genuinely unmatched test cases", async () => {
    const prompt = new RegexPrompt({
      message: "Pattern",
      tests: ["abc"],
    });
    const promise = prompt.run();
    await delay(10);

    await type("zzz");

    expect(indicatorsFor(outputSince(0), "abc")).toContain(CROSS);

    sendKey("\r");
    await expect(promise).resolves.toBeInstanceOf(RegExp);
  });
});
