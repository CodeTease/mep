import { OTPPrompt } from "../src/prompts/otp";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sendKey = (key: string) => {
  process.stdin.emit("data", Buffer.from(key));
};

describe("OTPPrompt", () => {
  let stdoutSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it("should submit once every slot is filled", async () => {
    const prompt = new OTPPrompt({
      message: "OTP",
      length: 4,
    });

    const promise = prompt.run();
    await delay(10);

    sendKey("1");
    sendKey("2");
    sendKey("3");
    await delay(10);

    sendKey("4");

    const result = await promise;
    expect(result).toBe("1234");
  });

  it("should keep the cursor inside the fixed slot array", async () => {
    const prompt = new OTPPrompt({
      message: "OTP",
      length: 6,
    });

    const promise = prompt.run();
    await delay(10);

    // Fill all but the last slot, then clear the fifth digit and move right.
    sendKey("1");
    sendKey("2");
    sendKey("3");
    sendKey("4");
    sendKey("5");
    sendKey("\u001b[D"); // Left
    sendKey("\u007f"); // Backspace
    sendKey("\u001b[C"); // Right
    await delay(10);

    // Typing into the last slot leaves a gap: the code is incomplete, so the
    // prompt must neither submit nor write past the fixed slot array.
    sendKey("9");
    await delay(10);

    let resolved = false;
    promise.then(() => {
      resolved = true;
    });
    await delay(10);
    expect(resolved).toBe(false);

    // The cursor wrapped back to the gap, so the next digit completes the code.
    sendKey("7");

    const result = await promise;
    expect(result).toBe("123479");
    expect(result).toHaveLength(6);
  });
});
