import { ExecPrompt } from "../src/prompts/exec";

describe("ExecPrompt", () => {
  let stdoutSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it("resolves after a successful command", async () => {
    const prompt = new ExecPrompt({ message: "Run", command: "echo hello" });

    await expect(prompt.run()).resolves.toBeUndefined();
  });

  it("captures stderr written after the child exits", async () => {
    const prompt = new ExecPrompt({
      message: "Run",
      command: "sh -c '(sleep 0.2; echo LATE >&2) & echo EARLY >&2; exit 2'",
    });

    const error = await prompt.run().then(
      () => null,
      (reason) => reason as Error & {
        code: number;
        stdout: string;
        stderr: string;
      },
    );

    expect(error).toBeInstanceOf(Error);
    expect(error!.message).toContain("EARLY");
    expect(error!.message).toContain("LATE");
    expect(error!.stderr).toContain("EARLY");
    expect(error!.stderr).toContain("LATE");
    expect(error!.code).toBe(2);
  });

  it("reports the exit code when the command writes no stderr", async () => {
    const prompt = new ExecPrompt({ message: "Run", command: "exit 3" });

    const error = await prompt.run().then(
      () => null,
      (reason) => reason as Error & { code: number; stdout: string; stderr: string },
    );

    expect(error).toBeInstanceOf(Error);
    expect(error!.message).toContain("exit code 3");
    expect(error!.code).toBe(3);
    expect(error!.stdout).toBe("");
    expect(error!.stderr).toBe("");
  });

  it("settles once even when stderr drains after the error is reported", async () => {
    let rejections = 0;
    const prompt = new ExecPrompt({
      message: "Run",
      command: "sh -c '(sleep 0.1; echo LATE >&2) & echo EARLY >&2; exit 1'",
    });

    await prompt.run().catch(() => {
      rejections++;
    });

    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(rejections).toBe(1);
  });
});
