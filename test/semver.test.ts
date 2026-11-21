import { SemVerPrompt } from "../src/prompts/semver";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sendKey = (key: string) => {
  process.stdin.emit("data", Buffer.from(key));
};

describe("SemVerPrompt", () => {
  let stdoutSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  const choosePatch = async (currentVersion: string): Promise<string> => {
    const prompt = new SemVerPrompt({ message: "Version", currentVersion });
    const promise = prompt.run();
    await delay(10);

    // Patch is the default selection.
    sendKey("\r");

    return promise;
  };

  const output = () =>
    stdoutSpy.mock.calls.map(([chunk]) => String(chunk)).join("");

  it("bumps a plain version", async () => {
    await expect(choosePatch("1.2.3")).resolves.toBe("1.2.4");
  });

  it("bumps a prerelease version from its numeric core", async () => {
    await expect(choosePatch("1.2.3-beta.1")).resolves.toBe("1.2.4");
    expect(output()).toContain("Patch (1.2.3 -> 1.2.4)");
  });

  it("bumps a v-prefixed version", async () => {
    await expect(choosePatch("v1.2.3")).resolves.toBe("1.2.4");
    expect(output()).toContain("Patch (1.2.3 -> 1.2.4)");
  });

  it("bumps a version with build metadata", async () => {
    await expect(choosePatch("1.2.3+build.5")).resolves.toBe("1.2.4");
  });

  it("bumps a version with both prerelease and build metadata", async () => {
    await expect(choosePatch("1.2.3-beta.1+build.5")).resolves.toBe("1.2.4");
  });

  it("bumps a version with surrounding whitespace", async () => {
    await expect(choosePatch(" 1.2.3 ")).resolves.toBe("1.2.4");
  });

  it("treats a missing patch as zero", async () => {
    await expect(choosePatch("1.2")).resolves.toBe("1.2.1");
    expect(output()).toContain("Minor (1.2.0 -> 1.3.0)");
  });

  it("treats missing minor and patch as zero", async () => {
    await expect(choosePatch("1")).resolves.toBe("1.0.1");
    expect(output()).toContain("Major (1.0.0 -> 2.0.0)");
  });

  it("falls back to 0.0.1 for unparseable input", async () => {
    await expect(choosePatch("not-a-version")).resolves.toBe("0.0.2");
    expect(output()).toContain("Patch (0.0.1 -> 0.0.2)");
  });
});
