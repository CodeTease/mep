import { CurlPrompt } from "../src/prompts/curl";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sendKey = (key: string) => {
  process.stdin.emit("data", Buffer.from(key));
};

describe("CurlPrompt nested editors", () => {
  let stdoutSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it("should ignore a second Enter and keep a single stdin listener", async () => {
    const baseline = process.stdin.listenerCount("data");
    const prompt = new CurlPrompt({
      message: "curl",
      defaultHeaders: { Accept: "*/*" },
    });

    const promise = prompt.run();
    await delay(10);

    // Move from URL to HEADERS, then deliver two Enters in one chunk.
    sendKey("\t");
    sendKey("\r\r");
    await delay(10);

    // Only the nested header editor may subscribe to stdin.
    expect(process.stdin.listenerCount("data")).toBe(baseline + 1);

    // Close the nested editor, then move to METHOD and submit.
    sendKey("\r");
    await delay(10);
    expect(process.stdin.listenerCount("data")).toBe(baseline + 1);

    sendKey("\t");
    sendKey("\r");

    const result = await promise;
    expect(result.headers).toEqual({ Accept: "*/*" });
    expect(process.stdin.listenerCount("data")).toBe(baseline);
  });
});
