import { SpreadsheetPrompt } from "../src/prompts/spreadsheet";
import { stripAnsi } from "../src/utils";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sendKey = (key: string) => {
  process.stdin.emit("data", Buffer.from(key));
};

const RIGHT = "\u001b[C";

describe("SpreadsheetPrompt", () => {
  let stdoutSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  const rendered = (): string =>
    stripAnsi(
      stdoutSpy.mock.calls.map((call) => String(call[0])).join(""),
    );

  it("renders a zero cell instead of a blank one", async () => {
    const prompt = new SpreadsheetPrompt({
      message: "s",
      columns: [
        { name: "product", key: "product" },
        { name: "stock", key: "stock" },
      ],
      data: [{ product: "Apple", stock: 0 }],
    });

    const promise = prompt.run();
    await delay(10);

    const appleLine = rendered()
      .split("\n")
      .find((line) => line.includes("Apple"));
    expect(appleLine).toContain("0");

    sendKey("\u0003");
    await expect(promise).rejects.toThrow("User force closed");
  });

  it("keeps a zero value across an edit-and-save cycle", async () => {
    const prompt = new SpreadsheetPrompt({
      message: "s",
      columns: [
        { name: "product", key: "product" },
        { name: "stock", key: "stock" },
      ],
      data: [{ product: "Apple", stock: 0 }],
    });

    const promise = prompt.run();
    await delay(10);

    sendKey(RIGHT); // cursor on stock
    await delay(10);
    sendKey("\r"); // edit, seeded with the current value
    await delay(10);
    sendKey("\r"); // save without changes
    await delay(10);
    sendKey("s");

    await expect(promise).resolves.toEqual([{ product: "Apple", stock: 0 }]);
  });

  it("keeps a false value across an edit-and-save cycle", async () => {
    const prompt = new SpreadsheetPrompt({
      message: "s",
      columns: [
        { name: "product", key: "product" },
        { name: "active", key: "active" },
      ],
      data: [{ product: "Apple", active: false }],
    });

    const promise = prompt.run();
    await delay(10);

    sendKey(RIGHT);
    await delay(10);
    sendKey("\r");
    await delay(10);
    sendKey("\r");
    await delay(10);
    sendKey("s");

    await expect(promise).resolves.toEqual([{ product: "Apple", active: false }]);
  });

  it("saves an edited zero cell as the typed text", async () => {
    const prompt = new SpreadsheetPrompt({
      message: "s",
      columns: [{ name: "stock", key: "stock" }],
      data: [{ stock: 0 }],
    });

    const promise = prompt.run();
    await delay(10);

    sendKey("\r"); // edit "0"
    await delay(10);
    sendKey("\x7f"); // clear
    sendKey("1");
    sendKey("2");
    await delay(10);
    sendKey("\r"); // save
    await delay(10);
    sendKey("s");

    await expect(promise).resolves.toEqual([{ stock: "12" }]);
  });

  it("keeps null and undefined cells blank", async () => {
    const prompt = new SpreadsheetPrompt({
      message: "s",
      columns: [
        { name: "a", key: "a" },
        { name: "b", key: "b" },
      ],
      data: [{ a: null, b: undefined }],
    });

    const promise = prompt.run();
    await delay(10);

    sendKey("\r"); // edit the blank cell
    await delay(10);
    sendKey("\r"); // save without typing
    await delay(10);
    sendKey(RIGHT);
    await delay(10);
    sendKey("\r");
    await delay(10);
    sendKey("\r");
    await delay(10);
    sendKey("s");

    await expect(promise).resolves.toEqual([{ a: "", b: "" }]);
  });
});
