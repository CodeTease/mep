import { KanbanPrompt } from "../src/prompts/kanban";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sendKey = (key: string) => {
  process.stdin.emit("data", Buffer.from(key));
};

describe("KanbanPrompt", () => {
  let stdoutSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it("does not insert undefined when moving out of an empty column", async () => {
    const prompt = new KanbanPrompt({
      message: "Kanban",
      columns: [
        { id: "a", title: "A", items: [] },
        { id: "b", title: "B", items: [] },
        { id: "c", title: "C", items: [{ id: "x", title: "X" }] },
      ],
    });

    const promise = prompt.run();
    await delay(10);

    sendKey("\u001b[C"); // Right to the empty middle column
    await delay(10);
    sendKey(" "); // Grab, but there is nothing to grab
    await delay(10);
    sendKey("\u001b[C"); // Try to move the missing item right
    await delay(10);
    sendKey("\r");

    const result = await promise;
    expect(result).toEqual({
      a: [],
      b: [],
      c: [{ id: "x", title: "X" }],
    });
  });

  it("does not insert undefined when moving left out of an empty column", async () => {
    const prompt = new KanbanPrompt({
      message: "Kanban",
      columns: [
        { id: "a", title: "A", items: [{ id: "x", title: "X" }] },
        { id: "b", title: "B", items: [] },
      ],
    });

    const promise = prompt.run();
    await delay(10);

    sendKey("\u001b[C"); // Right to the empty column
    await delay(10);
    sendKey(" "); // Grab, but there is nothing to grab
    await delay(10);
    sendKey("\u001b[D"); // Try to move the missing item left
    await delay(10);
    sendKey("\r");

    const result = await promise;
    expect(result).toEqual({
      a: [{ id: "x", title: "X" }],
      b: [],
    });
  });

  it("still moves a grabbed item between columns", async () => {
    const prompt = new KanbanPrompt({
      message: "Kanban",
      columns: [
        { id: "todo", title: "To Do", items: [{ id: "1", title: "Task A" }] },
        { id: "done", title: "Done", items: [] },
      ],
    });

    const promise = prompt.run();
    await delay(10);

    sendKey(" "); // Grab the item
    await delay(10);
    sendKey("\u001b[C"); // Move it right
    await delay(10);
    sendKey("\r");

    const result = await promise;
    expect(result).toEqual({
      todo: [],
      done: [{ id: "1", title: "Task A" }],
    });
  });
});
