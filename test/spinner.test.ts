import { ANSI } from "../src/ansi";
import { Spinner } from "../src/spinner";
import { symbols } from "../src/symbols";
import { theme } from "../src/theme";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Spinner", () => {
  let writeSpy: jest.SpyInstance;
  let initialSigintListeners: number;
  let activeSpinners: Spinner[];

  const createSpinner = (text: string): Spinner => {
    const spinner = new Spinner(text);
    activeSpinners.push(spinner);
    return spinner;
  };

  const output = (): string =>
    writeSpy.mock.calls.map((call) => String(call[0])).join("");

  beforeEach(() => {
    writeSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    initialSigintListeners = process.listenerCount("SIGINT");
    activeSpinners = [];
  });

  afterEach(() => {
    // Stop anything a failed assertion left running before restoring the spy.
    for (const spinner of activeSpinners) spinner.stop();
    writeSpy.mockRestore();
    expect(process.listenerCount("SIGINT")).toBe(initialSigintListeners);
  });

  it("terminates the line with the current text when stopped without a message", () => {
    const spinner = createSpinner("Working").start();
    writeSpy.mockClear();

    spinner.stop();

    expect(output()).toBe(
      `${ANSI.SHOW_CURSOR}${ANSI.ERASE_LINE}${ANSI.CURSOR_LEFT}Working\n`,
    );
  });

  it("replaces the line with the message passed to stop", () => {
    const spinner = createSpinner("Working").start();
    writeSpy.mockClear();

    spinner.stop("All done");

    expect(output()).toBe(
      `${ANSI.SHOW_CURSOR}${ANSI.ERASE_LINE}${ANSI.CURSOR_LEFT}All done\n`,
    );
  });

  it("renders a success message", () => {
    const spinner = createSpinner("Working").start();
    writeSpy.mockClear();

    spinner.stop("Deployed", "success");

    expect(output()).toBe(
      `${ANSI.SHOW_CURSOR}${ANSI.ERASE_LINE}${ANSI.CURSOR_LEFT}${theme.success}${symbols.tick}${ANSI.RESET} Deployed\n`,
    );
  });

  it("renders an error message", () => {
    const spinner = createSpinner("Working").start();
    writeSpy.mockClear();

    spinner.stop("Deploy failed", "error");

    expect(output()).toBe(
      `${ANSI.SHOW_CURSOR}${ANSI.ERASE_LINE}${ANSI.CURSOR_LEFT}${theme.error}${symbols.cross}${ANSI.RESET} Deploy failed\n`,
    );
  });

  it("renders an info message", () => {
    const spinner = createSpinner("Working").start();
    writeSpy.mockClear();

    spinner.stop("Nothing to deploy", "info");

    expect(output()).toBe(
      `${ANSI.SHOW_CURSOR}${ANSI.ERASE_LINE}${ANSI.CURSOR_LEFT}${theme.main}${symbols.info}${ANSI.RESET} Nothing to deploy\n`,
    );
  });

  it("uses the latest text after update()", () => {
    const spinner = createSpinner("Old text").start();
    spinner.update("New text");
    writeSpy.mockClear();

    spinner.stop();

    expect(output()).toContain("New text\n");
    expect(output()).not.toContain("Old text");
  });

  it("does not write anything when stopped before starting", () => {
    createSpinner("Idle").stop();

    expect(writeSpy).not.toHaveBeenCalled();
  });

  it("only finishes the line once when stopped twice", () => {
    const spinner = createSpinner("Working").start();
    spinner.stop("Done");
    writeSpy.mockClear();

    spinner.stop("Done again");

    expect(writeSpy).not.toHaveBeenCalled();
  });

  it("restores the cursor and removes its SIGINT listener", () => {
    const spinner = createSpinner("Working").start();
    expect(process.listenerCount("SIGINT")).toBe(initialSigintListeners + 1);

    spinner.stop();

    expect(process.listenerCount("SIGINT")).toBe(initialSigintListeners);
    expect(output()).toContain(ANSI.SHOW_CURSOR);
  });

  it("does not add a blank line when success() stops the spinner", () => {
    const spinner = createSpinner("Working").start();
    writeSpy.mockClear();

    spinner.success("Done");

    expect(output()).toBe(
      `${ANSI.SHOW_CURSOR}${ANSI.ERASE_LINE}${ANSI.CURSOR_LEFT}${theme.success}${symbols.tick}${ANSI.RESET} Done\n`,
    );
  });

  it("does not add a blank line when error() stops the spinner", () => {
    const spinner = createSpinner("Working").start();
    writeSpy.mockClear();

    spinner.error("Failed");

    expect(output()).toBe(
      `${ANSI.SHOW_CURSOR}${ANSI.ERASE_LINE}${ANSI.CURSOR_LEFT}${theme.error}${symbols.cross}${ANSI.RESET} Failed\n`,
    );
  });

  it("clears the line without writing a newline", () => {
    const spinner = createSpinner("Working").start();
    writeSpy.mockClear();

    spinner.clear();

    expect(output()).toBe(
      `${ANSI.SHOW_CURSOR}${ANSI.ERASE_LINE}${ANSI.CURSOR_LEFT}`,
    );
  });

  it("runs SIGINT listeners registered after start and restores the cursor", () => {
    createSpinner("Working").start();
    writeSpy.mockClear();
    const handled = jest.fn();
    process.on("SIGINT", handled);

    try {
      process.emit("SIGINT", "SIGINT");
    } finally {
      process.removeListener("SIGINT", handled);
    }

    expect(handled).toHaveBeenCalledTimes(1);
    expect(output()).toContain(ANSI.SHOW_CURSOR);
  });

  it("does not exit when another SIGINT listener is registered", async () => {
    const exitSpy = jest
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);
    const handled = jest.fn();
    process.on("SIGINT", handled);

    try {
      createSpinner("Working").start();
      process.emit("SIGINT", "SIGINT");
      await delay(10);

      expect(handled).toHaveBeenCalledTimes(1);
      expect(exitSpy).not.toHaveBeenCalled();
    } finally {
      process.removeListener("SIGINT", handled);
      exitSpy.mockRestore();
    }
  });

  it("exits with an interrupt status when no other SIGINT listener handles it", async () => {
    const exitSpy = jest
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);

    try {
      createSpinner("Working").start();
      process.emit("SIGINT", "SIGINT");
      await delay(10);

      expect(exitSpy).toHaveBeenCalledWith(130);
    } finally {
      exitSpy.mockRestore();
    }
  });

  it("leaves an exit code set before the interrupt untouched", async () => {
    const exitSpy = jest
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);
    process.exitCode = 2;

    try {
      createSpinner("Working").start();
      process.emit("SIGINT", "SIGINT");
      await delay(10);

      expect(process.exitCode).toBe(2);
      expect(exitSpy).not.toHaveBeenCalled();
    } finally {
      process.exitCode = 0;
      exitSpy.mockRestore();
    }
  });

  it("restores the cursor on SIGINT", () => {
    createSpinner("Working").start();
    writeSpy.mockClear();

    process.emit("SIGINT", "SIGINT");

    expect(output()).toContain(ANSI.SHOW_CURSOR);
    expect(process.listenerCount("SIGINT")).toBe(initialSigintListeners);
  });
});
