import { DatePrompt } from "../src/prompts/date";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sendKey = (key: string) => {
  process.stdin.emit("data", Buffer.from(key));
};

describe("DatePrompt", () => {
  let stdoutSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  const toMonthField = async () => {
    sendKey("\t"); // Year -> Month
    await delay(10);
  };

  it("clamps the day when moving from Jan 31 into February", async () => {
    const prompt = new DatePrompt({
      message: "Date",
      initial: new Date(2025, 0, 31),
    });
    const promise = prompt.run();
    await delay(10);

    await toMonthField();
    sendKey("\u001b[A"); // Up -> February
    await delay(10);
    sendKey("\r");

    await expect(promise).resolves.toEqual(new Date(2025, 1, 28));
  });

  it("clamps to Feb 29 when moving into a leap February", async () => {
    const prompt = new DatePrompt({
      message: "Date",
      initial: new Date(2024, 0, 31),
    });
    const promise = prompt.run();
    await delay(10);

    await toMonthField();
    sendKey("\u001b[A");
    await delay(10);
    sendKey("\r");

    await expect(promise).resolves.toEqual(new Date(2024, 1, 29));
  });

  it("keeps the day when moving backwards from Jan 31", async () => {
    const prompt = new DatePrompt({
      message: "Date",
      initial: new Date(2025, 0, 31),
    });
    const promise = prompt.run();
    await delay(10);

    await toMonthField();
    sendKey("\u001b[B"); // Down -> December 2024
    await delay(10);
    sendKey("\r");

    await expect(promise).resolves.toEqual(new Date(2024, 11, 31));
  });

  it("clamps a leap day when moving to a non-leap February", async () => {
    const prompt = new DatePrompt({
      message: "Date",
      initial: new Date(2025, 2, 31),
    });
    const promise = prompt.run();
    await delay(10);

    await toMonthField();
    sendKey("\u001b[B"); // Down -> February 2025
    await delay(10);
    sendKey("\r");

    await expect(promise).resolves.toEqual(new Date(2025, 1, 28));
  });

  it("moves from February 29 back into January", async () => {
    const prompt = new DatePrompt({
      message: "Date",
      initial: new Date(2024, 1, 29),
    });
    const promise = prompt.run();
    await delay(10);

    await toMonthField();
    sendKey("\u001b[B");
    await delay(10);
    sendKey("\r");

    await expect(promise).resolves.toEqual(new Date(2024, 0, 29));
  });
});
