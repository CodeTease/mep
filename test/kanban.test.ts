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

  it("preserves non-JSON item values without mutating the input columns", async () => {
    const due = new Date("2026-01-02T03:04:05.000Z");
    const item: { id: string; title: string; due: Date; note?: string } = {
      id: "1",
      title: "Task A",
      due,
      note: undefined,
    };
    const columns = [{ id: "todo", title: "To Do", items: [item] }];

    const prompt = new KanbanPrompt({ message: "Kanban", columns });
    const promise = prompt.run();
    await delay(10);

    sendKey(" ");
    await delay(10);
    sendKey("\r");

    const result = await promise;
    const submitted = result.todo[0];
    expect(submitted.due).toBeInstanceOf(Date);
    expect(submitted.due).toBe(due);
    expect("note" in submitted).toBe(true);
    expect(columns[0].items).toEqual([item]);
  });

  it("does not throw on cyclic item data", async () => {
    const item: { id: string; title: string; self?: unknown } = { id: "1", title: "Loop" };
    item.self = item;

    const prompt = new KanbanPrompt({
      message: "Kanban",
      columns: [
        { id: "todo", title: "To Do", items: [item] },
        { id: "done", title: "Done", items: [] },
      ],
    });

    const promise = prompt.run();
    await delay(10);

    sendKey(" ");
    await delay(10);
    sendKey("\u001b[C");
    await delay(10);
    sendKey("\r");

    const result = await promise;
    expect(result.todo).toEqual([]);
    expect(result.done).toEqual([item]);
    expect(item.self).toBe(item);
  });

  it("moves items between columns without mutating the caller's columns", async () => {
    const columns = [
      { id: "todo", title: "To Do", items: [{ id: "1", title: "Task A" }] },
      { id: "done", title: "Done", items: [{ id: "2", title: "Task B" }] },
    ];

    const prompt = new KanbanPrompt({ message: "Kanban", columns });
    const promise = prompt.run();
    await delay(10);

    sendKey(" "); // Grab Task A
    await delay(10);
    sendKey("\u001b[C"); // Move it right
    await delay(10);
    sendKey("\r");

    const result = await promise;
    expect(result.todo).toEqual([]);
    expect(result.done.map((item: { id: string }) => item.id)).toEqual(["1", "2"]);

    // The caller's columns keep their original layout.
    expect(columns[0].items).toEqual([{ id: "1", title: "Task A" }]);
    expect(columns[1].items).toEqual([{ id: "2", title: "Task B" }]);
  });
});
