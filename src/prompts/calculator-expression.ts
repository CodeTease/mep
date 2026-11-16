/**
 * Safe, allowlisted arithmetic expression evaluator used by `CalculatorPrompt`.
 *
 * Expressions are tokenized and parsed with a small recursive-descent parser.
 * User input is never passed to `Function`, `eval`, or any other JavaScript
 * compiler, so property access, strings, and arbitrary code cannot execute.
 */

interface MathFunction {
    arity: number;
    apply: (...args: number[]) => number;
}

type TokenType = 'number' | 'identifier' | 'symbol';

interface Token {
    type: TokenType;
    value: string;
}

const NUMBER_PATTERN = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/;
const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*/;
const MULTIPLICATIVE_OPERATORS = new Set(['*', '/', '%']);
const ADDITIVE_OPERATORS = new Set(['+', '-']);
const SYMBOLS = new Set(['+', '-', '*', '/', '%', '(', ')', ',']);

const MATH_FUNCTIONS = new Map<string, MathFunction>([
    ['sin', { arity: 1, apply: Math.sin }],
    ['cos', { arity: 1, apply: Math.cos }],
    ['tan', { arity: 1, apply: Math.tan }],
    ['log', { arity: 1, apply: Math.log }],
    ['sqrt', { arity: 1, apply: Math.sqrt }],
    ['abs', { arity: 1, apply: Math.abs }],
    ['pow', { arity: 2, apply: Math.pow }],
    ['floor', { arity: 1, apply: Math.floor }],
    ['ceil', { arity: 1, apply: Math.ceil }],
    ['round', { arity: 1, apply: Math.round }],
]);

const MATH_CONSTANTS = new Map<string, number>([
    ['PI', Math.PI],
    ['E', Math.E],
]);

/**
 * Converts an expression string into tokens. Returns `null` when the input
 * contains anything outside the supported grammar, including property access,
 * brackets, braces, strings, and unary `!`.
 */
function tokenize(expression: string): Token[] | null {
    const tokens: Token[] = [];
    let index = 0;

    while (index < expression.length) {
        const rest = expression.slice(index);
        const char = rest[0];

        if (/\s/.test(char)) {
            index++;
            continue;
        }

        const numberMatch = rest.match(NUMBER_PATTERN);
        if (numberMatch) {
            tokens.push({ type: 'number', value: numberMatch[0] });
            index += numberMatch[0].length;
            continue;
        }

        const identifierMatch = rest.match(IDENTIFIER_PATTERN);
        if (identifierMatch) {
            tokens.push({ type: 'identifier', value: identifierMatch[0] });
            index += identifierMatch[0].length;
            continue;
        }

        if (rest.startsWith('**')) {
            tokens.push({ type: 'symbol', value: '**' });
            index += 2;
            continue;
        }

        if (SYMBOLS.has(char)) {
            tokens.push({ type: 'symbol', value: char });
            index++;
            continue;
        }

        return null;
    }

    return tokens;
}

class ExpressionParser {
    private index = 0;

    constructor(
        private readonly tokens: Token[],
        private readonly variables: Record<string, number>,
    ) {}

    parse(): number | null {
        const value = this.parseExpression();
        if (value === null || this.index !== this.tokens.length) {
            return null;
        }
        return value;
    }

    private parseExpression(): number | null {
        return this.parseAdditive();
    }

    private parseAdditive(): number | null {
        let left = this.parseMultiplicative();
        if (left === null) {
            return null;
        }

        while (true) {
            const token = this.peek();
            if (!token || token.type !== 'symbol' || !ADDITIVE_OPERATORS.has(token.value)) {
                return left;
            }

            this.index++;
            const right = this.parseMultiplicative();
            if (right === null) {
                return null;
            }

            left = token.value === '+' ? left + right : left - right;
        }
    }

    private parseMultiplicative(): number | null {
        let left = this.parseUnary();
        if (left === null) {
            return null;
        }

        while (true) {
            const token = this.peek();
            if (!token || token.type !== 'symbol' || !MULTIPLICATIVE_OPERATORS.has(token.value)) {
                return left;
            }

            this.index++;
            const right = this.parseUnary();
            if (right === null) {
                return null;
            }

            if (token.value === '*') {
                left = left * right;
            } else if (token.value === '/') {
                left = left / right;
            } else {
                left = left % right;
            }
        }
    }

    private parseUnary(): number | null {
        const token = this.peek();
        if (token && token.type === 'symbol' && ADDITIVE_OPERATORS.has(token.value)) {
            this.index++;
            const value = this.parseUnary();
            if (value === null) {
                return null;
            }
            return token.value === '-' ? -value : value;
        }

        return this.parsePower();
    }

    private parsePower(): number | null {
        const base = this.parsePrimary();
        if (base === null) {
            return null;
        }

        const token = this.peek();
        if (token && token.type === 'symbol' && token.value === '**') {
            this.index++;
            const exponent = this.parseUnary();
            if (exponent === null) {
                return null;
            }
            return base ** exponent;
        }

        return base;
    }

    private parsePrimary(): number | null {
        const token = this.peek();
        if (!token) {
            return null;
        }

        if (token.type === 'number') {
            this.index++;
            return Number(token.value);
        }

        if (token.type === 'identifier') {
            this.index++;
            return this.parseIdentifier(token.value);
        }

        if (token.type === 'symbol' && token.value === '(') {
            this.index++;
            const value = this.parseExpression();
            if (value === null || !this.consumeSymbol(')')) {
                return null;
            }
            return value;
        }

        return null;
    }

    private parseIdentifier(name: string): number | null {
        // Variables keep the historical precedence over constants and functions.
        if (Object.prototype.hasOwnProperty.call(this.variables, name)) {
            const value = this.variables[name];
            return typeof value === 'number' ? value : null;
        }

        const mathFunction = MATH_FUNCTIONS.get(name);
        if (mathFunction) {
            if (!this.consumeSymbol('(')) {
                return null;
            }

            const args = this.parseArguments();
            if (args === null || args.length !== mathFunction.arity) {
                return null;
            }

            return mathFunction.apply(...args);
        }

        const constant = MATH_CONSTANTS.get(name);
        return constant === undefined ? null : constant;
    }

    private parseArguments(): number[] | null {
        const args: number[] = [];

        if (this.consumeSymbol(')')) {
            return args;
        }

        while (true) {
            const value = this.parseExpression();
            if (value === null) {
                return null;
            }
            args.push(value);

            if (this.consumeSymbol(',')) {
                continue;
            }
            if (this.consumeSymbol(')')) {
                return args;
            }
            return null;
        }
    }

    private peek(): Token | undefined {
        return this.tokens[this.index];
    }

    private consumeSymbol(symbol: string): boolean {
        const token = this.peek();
        if (token && token.type === 'symbol' && token.value === symbol) {
            this.index++;
            return true;
        }
        return false;
    }
}

/**
 * Evaluates an arithmetic expression without executing JavaScript.
 *
 * Supported syntax:
 * - numbers, including decimals and scientific notation
 * - `+`, `-`, `*`, `/`, `%`, and `**`
 * - unary `+` and `-`
 * - parentheses
 * - the variables supplied in `variables`
 * - the constants `PI` and `E`
 * - `sin`, `cos`, `tan`, `log`, `sqrt`, `abs`, `pow`, `floor`, `ceil`, and `round`
 *
 * @returns The numeric result, or `null` when the expression is invalid or
 * unsupported.
 */
export function evaluateExpression(expression: string, variables: Record<string, number> = {}): number | null {
    try {
        const tokens = tokenize(expression);
        if (tokens === null) {
            return null;
        }
        return new ExpressionParser(tokens, variables).parse();
    } catch (_error) {
        return null;
    }
}
