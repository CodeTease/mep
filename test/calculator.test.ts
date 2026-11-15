import { CalculatorPrompt } from "../src/prompts/calculator";
import { evaluateExpression } from "../src/prompts/calculator-expression";

/**
 * Builds a letter-free JavaScript expression that resolves to `value` using
 * only arrays, objects, booleans, and string indexing. Used to prove that the
 * calculator parser rejects JSFuck-style payloads instead of executing them.
 */
const encodeLetterlessString = (value: string): string => {
  const chars: Record<string, string> = {
    c: "([]+{})[5]",
    o: "([]+{})[1]",
    n: "([][[]]+[])[1]",
    s: "(![]+[])[3]",
    t: "(!![]+[])[0]",
    r: "(!![]+[])[1]",
    u: "(!![]+[])[2]",
    e: "(!![]+[])[3]",
    " ": "([]+{})[7]",
    "1": "(+!![]+[])",
  };

  return value
    .split("")
    .map((char) => `(${chars[char]})`)
    .join("+");
};

const buildLetterlessCodeExecutionPayload = (): string => {
  const constructor = encodeLetterlessString("constructor");
  const body = encodeLetterlessString("return 1");
  return `[][${constructor}][${constructor}](${body})()`;
};

describe("evaluateExpression", () => {
  it("should evaluate arithmetic with precedence and parentheses", () => {
    expect(evaluateExpression("2 + 3 * 4")).toBe(14);
    expect(evaluateExpression("(2 + 3) * 4")).toBe(20);
    expect(evaluateExpression("2 ** 3 ** 2")).toBe(512);
    expect(evaluateExpression("-2 ** 2")).toBe(-4);
    expect(evaluateExpression(".5 + 1.")).toBe(1.5);
    expect(evaluateExpression("1e3 / 2")).toBe(500);
  });

  it("should evaluate allowlisted math functions and constants", () => {
    expect(evaluateExpression("sin(PI / 2)")).toBeCloseTo(1);
    expect(evaluateExpression("sqrt(16)")).toBe(4);
    expect(evaluateExpression("pow(2, 3)")).toBe(8);
    expect(evaluateExpression("abs(-5) + floor(2.9) + ceil(2.1) + round(2.5)")).toBe(13);
    expect(evaluateExpression("log(E)")).toBeCloseTo(1);
  });

  it("should resolve variables", () => {
    expect(evaluateExpression("price * qty", { price: 29.99, qty: 5 })).toBeCloseTo(149.95);
    expect(evaluateExpression("x + 1", { x: 41 })).toBe(42);
  });

  it("should reject unknown identifiers and invalid syntax", () => {
    expect(evaluateExpression("a")).toBeNull();
    expect(evaluateExpression("process")).toBeNull();
    expect(evaluateExpression("sin()")).toBeNull();
    expect(evaluateExpression("sin(1, 2)")).toBeNull();
    expect(evaluateExpression("pow(2)")).toBeNull();
    expect(evaluateExpression("1 2")).toBeNull();
    expect(evaluateExpression("(1 + 2")).toBeNull();
    expect(evaluateExpression("")).toBeNull();
  });

  it("should reject letterless code-execution payloads", () => {
    const payload = buildLetterlessCodeExecutionPayload();
    expect(payload).not.toMatch(/[a-zA-Z_]/);
    expect(evaluateExpression(payload)).toBeNull();
  });

  it("should reject JavaScript property access and calls", () => {
    expect(evaluateExpression("[][constructor]")).toBeNull();
    expect(evaluateExpression("process.exit()")).toBeNull();
    expect(evaluateExpression("globalThis")).toBeNull();
  });
});

describe("CalculatorPrompt", () => {
  it("should not execute an untrusted initial expression", () => {
    const prompt = new CalculatorPrompt({
      message: "Calc",
      initial: buildLetterlessCodeExecutionPayload(),
    });

    const preview = (prompt as unknown as { previewValue: string }).previewValue;
    expect(preview).toBe("");
  });

  it("should preview a valid initial expression", () => {
    const prompt = new CalculatorPrompt({ message: "Calc", initial: "2 + 2" });

    const preview = (prompt as unknown as { previewValue: string }).previewValue;
    expect(preview).toBe("4");
  });
});
