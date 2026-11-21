import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { BreadcrumbSearchPrompt } from "../src/prompts/breadcrumb-search";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sendKey = (key: string) => {
  process.stdin.emit("data", Buffer.from(key));
};

describe("BreadcrumbSearchPrompt", () => {
  let stdoutSpy: jest.SpyInstance;
  let root: string;
  let writes: string[];

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "mep-breadcrumb-search-"));
    await fs.mkdir(path.join(root, "sub1"));
    await fs.mkdir(path.join(root, "sub2"));
    await fs.writeFile(path.join(root, "sub1", "inner.txt"), "content");

    writes = [];
    stdoutSpy = jest.spyOn(process.stdout, "write").mockImplementation((chunk: any) => {
      writes.push(String(chunk));
      return true;
    });
  });

  afterEach(async () => {
    stdoutSpy.mockRestore();
    await fs.rm(root, { recursive: true, force: true });
  });

  it("renders the new directory after drilling down from search results", async () => {
    const prompt = new BreadcrumbSearchPrompt({ message: "Find", root });

    const promise = prompt.run();
    await delay(30);

    for (const char of "sub") sendKey(char);
    await delay(20);

    expect(writes.join("")).toContain("(Search: sub)");

    writes.length = 0;
    sendKey("\r"); // Drill into sub1
    await delay(40);

    const frame = writes.join("");
    expect(frame).not.toContain("(Search: sub)");
    expect(frame).toContain("inner.txt");

    // Enter now acts on the displayed directory, not on stale search results.
    sendKey("\r");
    await expect(promise).resolves.toBe(path.join(root, "sub1", "inner.txt"));
  });
});
