import { CalendarPrompt } from "../src/prompts/calendar";
import { stripAnsi } from "../src/utils";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sendKey = (key: string) => {
  process.stdin.emit("data", Buffer.from(key));
};

describe("CalendarPrompt", () => {
  let stdoutSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  const renderedOutput = () =>
    stripAnsi(stdoutSpy.mock.calls.map((call) => String(call[0])).join(""));

  describe("range anchors", () => {
    it("keeps the anchor when paging to another month", async () => {
      const prompt = new CalendarPrompt({
        message: "Cal",
        mode: "range",
        initial: new Date(2026, 0, 15),
      });
      const promise = prompt.run();
      await delay(10);

      sendKey("\r"); // Start the range on Jan 15
      await delay(10);
      sendKey("\x1b[6~"); // PageDown -> Feb 15
      await delay(10);
      sendKey("\r"); // Finish the range

      await expect(promise).resolves.toEqual([
        new Date(2026, 0, 15),
        new Date(2026, 1, 15),
      ]);
    });

    it("keeps the anchor when pressing End", async () => {
      const prompt = new CalendarPrompt({
        message: "Cal",
        mode: "range",
        initial: new Date(2026, 0, 15),
      });
      const promise = prompt.run();
      await delay(10);

      sendKey("\r"); // Start the range on Jan 15
      await delay(10);
      sendKey("\x1b[F"); // End -> Jan 31
      await delay(10);
      sendKey("\r");

      await expect(promise).resolves.toEqual([
        new Date(2026, 0, 15),
        new Date(2026, 0, 31),
      ]);
    });

    it("keeps the anchor when ctrl+scrolling", async () => {
      const prompt = new CalendarPrompt({
        message: "Cal",
        mode: "range",
        initial: new Date(2026, 0, 15),
      });
      const promise = prompt.run();
      await delay(10);

      sendKey("\r"); // Start the range on Jan 15
      await delay(10);
      // SGR mouse: ctrl (16) + scroll down (64 + 1)
      sendKey("\x1b[<81;10;10M");
      await delay(10);
      sendKey("\r");

      await expect(promise).resolves.toEqual([
        new Date(2026, 0, 15),
        new Date(2026, 0, 16),
      ]);
    });
  });

  describe("multiple selections", () => {
    it("keeps committed dates when navigating afterwards", async () => {
      const prompt = new CalendarPrompt({
        message: "Cal",
        multiple: true,
        initial: new Date(2026, 0, 15),
      });
      const promise = prompt.run();
      await delay(10);

      sendKey("\x1b[C"); // Right -> Jan 16
      await delay(10);
      sendKey("\r"); // Toggle Jan 16 on
      await delay(10);
      sendKey("\x1b[6~"); // PageDown -> Feb 16
      await delay(10);
      sendKey("d"); // Done

      await expect(promise).resolves.toEqual([
        new Date(2026, 0, 15),
        new Date(2026, 0, 16),
      ]);
    });
  });

  describe("min/max bounds", () => {
    it("clamps an initial date below min", async () => {
      const prompt = new CalendarPrompt({
        message: "Cal",
        initial: new Date(2020, 0, 1),
        min: new Date(2030, 0, 1),
      });
      const promise = prompt.run();
      await delay(10);

      sendKey("\r");

      await expect(promise).resolves.toEqual(new Date(2030, 0, 1));
    });

    it("clamps an initial date above max", async () => {
      const prompt = new CalendarPrompt({
        message: "Cal",
        initial: new Date(2040, 0, 1),
        max: new Date(2030, 11, 31),
      });
      const promise = prompt.run();
      await delay(10);

      sendKey("\r");

      await expect(promise).resolves.toEqual(new Date(2030, 11, 31));
    });

    it("stops day navigation at min", async () => {
      const prompt = new CalendarPrompt({
        message: "Cal",
        initial: new Date(2026, 0, 12),
        min: new Date(2026, 0, 10),
      });
      const promise = prompt.run();
      await delay(10);

      for (let i = 0; i < 5; i++) {
        sendKey("\x1b[D"); // Left
      }
      await delay(10);
      sendKey("\r");

      await expect(promise).resolves.toEqual(new Date(2026, 0, 10));
    });

    it("stops month navigation at max", async () => {
      const prompt = new CalendarPrompt({
        message: "Cal",
        initial: new Date(2026, 0, 15),
        max: new Date(2026, 1, 10),
      });
      const promise = prompt.run();
      await delay(10);

      sendKey("\x1b[6~"); // PageDown -> clamped to Feb 10
      await delay(10);
      sendKey("\r");

      await expect(promise).resolves.toEqual(new Date(2026, 1, 10));
    });

    it("stops year navigation at max", async () => {
      const prompt = new CalendarPrompt({
        message: "Cal",
        initial: new Date(2026, 0, 15),
        max: new Date(2026, 11, 31),
      });
      const promise = prompt.run();
      await delay(10);

      sendKey("\x1b[1;5B"); // Ctrl+Down -> clamped to Dec 31 2026
      await delay(10);
      sendKey("\r");

      await expect(promise).resolves.toEqual(new Date(2026, 11, 31));
    });

    it("stops Home at min within the month", async () => {
      const prompt = new CalendarPrompt({
        message: "Cal",
        initial: new Date(2026, 0, 15),
        min: new Date(2026, 0, 10),
      });
      const promise = prompt.run();
      await delay(10);

      sendKey("\x1b[H"); // Home -> clamped to Jan 10
      await delay(10);
      sendKey("\r");

      await expect(promise).resolves.toEqual(new Date(2026, 0, 10));
    });

    it("does not page the view before the month containing min", async () => {
      const prompt = new CalendarPrompt({
        message: "Cal",
        initial: new Date(2026, 2, 10),
        min: new Date(2026, 2, 10),
      });
      const promise = prompt.run();
      await delay(10);

      sendKey("\x1b[5~"); // PageUp
      await delay(10);

      expect(renderedOutput()).toContain("March 2026");
      expect(renderedOutput()).not.toContain("February 2026");

      sendKey("\r");
      await expect(promise).resolves.toEqual(new Date(2026, 2, 10));
    });

    it("throws when min is after max", () => {
      expect(
        () =>
          new CalendarPrompt({
            message: "Cal",
            min: new Date(2026, 1, 1),
            max: new Date(2026, 0, 1),
          }),
      ).toThrow('"min" must be on or before "max"');
    });
  });
});

