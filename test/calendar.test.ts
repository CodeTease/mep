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
});
