# Contributing to Mep

We welcome contributions! Whether it's fixing bugs, adding new prompts, or improving documentation.

## Getting Started

1.  **Fork** the repository.
2.  **Clone** your fork.
3.  **Install dependencies**: `bun install`.
4.  **Create a branch**: `git checkout -b feature/my-new-prompt`.

## Development

- Run examples: `bun run demo`
- Run tests: `bun test`
- Type check: `bun run typecheck`
- Lint code: `bun run lint`
- Format code: `bun run fmt`

## Style Guide

- Use TypeScript.
- Follow the existing code style (enforced by `bun fmt` and `bun lint`, configured in `bunfig.toml`).
- Ensure new prompts have `options` interface and return types.
- Add JSDoc comments for public APIs.

## Pull Requests

- Open a PR against the `main` branch.
- Describe your changes clearly.
- Ensure tests pass.

## Related

- [Architecture](./architecture.md)
- [Testing](./testing.md)
