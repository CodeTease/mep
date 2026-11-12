import { PhonePrompt } from "../src/prompts/phone";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const sendKey = (key: string) => {
  process.stdin.emit("data", Buffer.from(key));
};

describe("PhonePrompt", () => {
  let stdoutSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it("should format input correctly for VN (default)", async () => {
    const prompt = new PhonePrompt({
      message: "Phone",
      defaultCountry: "VN", // +84, ### #### ###
    });

    const promise = prompt.run();
    await delay(10);

    // Input digits: 0901234567
    // Mask: ### #### ###
    // Expected: 090 1234 567
    // Result: +840901234567

    "0901234567".split("").forEach((k) => sendKey(k));
    await delay(10);
    sendKey("\r");

    const result = await promise;
    expect(result).toBe("+840901234567");
  });

  it("should handle switching sections and search", async () => {
    // Assume US is in the list
    const prompt = new PhonePrompt({
      message: "Phone",
      defaultCountry: "VN",
    });

    const promise = prompt.run();
    await delay(10);

    // Switch to Country section
    sendKey("\t");
    await delay(10);

    // Type 'US'
    sendKey("u");
    sendKey("s");
    await delay(20); // Search delay if any

    // Should switch to US (+1)
    // Switch back to number
    sendKey("\t");
    await delay(10);

    // Type number
    "2025550123".split("").forEach((k) => sendKey(k));
    await delay(10);
    sendKey("\r");

    const result = await promise;
    expect(result).toBe("+12025550123");
  });

  it("should validate strict length", async () => {
    const prompt = new PhonePrompt({
      message: "Strict",
      defaultCountry: "VN",
      strict: true,
    });

    const promise = prompt.run();
    await delay(10);

    // Short input
    sendKey("1");
    sendKey("\r");

    // Should not resolve
    let resolved = false;
    promise.then(() => (resolved = true));
    await delay(20);
    expect(resolved).toBe(false);

    // Fill remaining
    // VN mask: ### #### ### (10 digits)
    // typed 1, need 9 more
    "234567890".split("").forEach((k) => sendKey(k));
    await delay(10);
    sendKey("\r");

    const result = await promise;
    expect(result).toBe("+841234567890");
  });

  it("should not crash when cycling a country filter that matches nothing", async () => {
    const prompt = new PhonePrompt({
      message: "Phone",
      defaultCountry: "VN",
    });

    const promise = prompt.run();
    await delay(10);

    // Switch to the country section and type a filter with no matches.
    // Digits never match an ISO code, name, or dial code, so the filter stays
    // empty at every prefix and VN remains the last valid country.
    sendKey("\t");
    "0000".split("").forEach((k) => sendKey(k));
    await delay(10);

    // Cycling an empty filtered list must be a no-op, not a TypeError.
    expect(() => sendKey("\u001b[A")).not.toThrow();
    expect(() => sendKey("\u001b[B")).not.toThrow();
    await delay(10);

    // The last valid country (VN) is kept, so the number still submits with +84.
    sendKey("\t");
    await delay(10);
    "0901234567".split("").forEach((k) => sendKey(k));
    await delay(10);
    sendKey("\r");

    const result = await promise;
    expect(result).toBe("+840901234567");
  });

  it("should accept a longer valid length for multi-mask countries in strict mode", async () => {
    const prompt = new PhonePrompt({
      message: "Strict UK",
      defaultCountry: "GB",
      strict: true,
    });

    const promise = prompt.run();
    await delay(10);

    "12345678901".split("").forEach((k) => sendKey(k));
    await delay(10);
    sendKey("\r");

    const result = await promise;
    expect(result).toBe("+4412345678901");
  });

  it("should await an async validate callback before submitting", async () => {
    let validatedValue = "";
    const prompt = new PhonePrompt({
      message: "Phone",
      defaultCountry: "VN",
      validate: async (value) => {
        await delay(20);
        validatedValue = value;
        return true;
      },
    });

    const promise = prompt.run();
    await delay(10);

    "0901234567".split("").forEach((k) => sendKey(k));
    await delay(10);
    sendKey("\r");

    const result = await promise;
    expect(result).toBe("+840901234567");
    expect(validatedValue).toBe("+840901234567");
  });

  it("should not submit when an async validator rejects the number", async () => {
    const prompt = new PhonePrompt({
      message: "Phone",
      defaultCountry: "VN",
      validate: async () => {
        await delay(20);
        return "Not allowed";
      },
    });

    const promise = prompt.run();
    await delay(10);

    "0901234567".split("").forEach((k) => sendKey(k));
    await delay(10);
    sendKey("\r");

    // While the validator is pending (and after it fails), Enter must not submit.
    let settled = false;
    promise.then(
      () => (settled = true),
      () => (settled = true),
    );
    await delay(60);
    expect(settled).toBe(false);

    // The message returned by the validator is rendered.
    const output = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(output).toContain("Not allowed");

    sendKey("\u0003");
    await expect(promise).rejects.toThrow("User force closed");
  });

  it("should render an error when an async validator throws", async () => {
    const prompt = new PhonePrompt({
      message: "Phone",
      defaultCountry: "VN",
      validate: async () => {
        await delay(10);
        throw new Error("Validator exploded");
      },
    });

    const promise = prompt.run();
    await delay(10);

    "0901234567".split("").forEach((k) => sendKey(k));
    await delay(10);
    sendKey("\r");
    await delay(40);

    const output = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(output).toContain("Validator exploded");

    sendKey("\u0003");
    await expect(promise).rejects.toThrow("User force closed");
  });
});
