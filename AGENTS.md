# Agent Instructions

## Project overview

Mep is a zero-dependency TypeScript library for interactive command-line prompts in Node.js. Prompt implementations live in `src/prompts/`; the core prompt lifecycle and shared behavior are in `src/base.ts`, `src/core.ts`, `src/input.ts`, and related modules. Public exports are collected in `src/index.ts`.

## Development conventions

- Use TypeScript and follow existing patterns in neighboring source files.
- Keep the runtime library dependency-free. Do not add runtime packages without a clear requirement and explicit justification.
- Prompts should use the shared `Prompt` base class and existing input, ANSI, rendering, and utility abstractions where appropriate; avoid duplicating core terminal behavior.
- Preserve type safety with explicit options and return types. Document public APIs with JSDoc, consistent with the contribution guide.
- When adding or changing a public prompt, update the exports in `src/index.ts` and add or update focused tests under `test/`.
- Add or update documentation under `docs/` when behavior or public usage changes. Examples are in `examples/` and `example.ts`.
- Follow `biome.json`: four-space indentation, single quotes for JavaScript/TypeScript, and a 120-character line width. The configured lint scope is `src/` (tests and examples are excluded).
- Treat `dist/` as build output; make implementation changes in `src/`, not generated files.

## Commands

Use Bun, as the package scripts and CI are configured for it:

```sh
bun install             # Install dependencies
bun run typecheck       # TypeScript check
bun run test            # Run the Bun test suite
bun run lint            # Check src/ with Biome
bun run build           # Compile JavaScript and generate declarations in dist/
```

For focused tests, run `bun test test/<file>.test.ts` (for example, `bun test test/prompts.test.ts`). Run relevant tests and typecheck for code changes; run lint and build as appropriate, especially for changes to source or package exports. Do not claim a check passed unless it was run.

## Tests

- Tests use Bun's test runner (`bun:test`) and live in `test/` with `.test.ts` filenames.
- Follow existing test setup and mock terminal input through the project's abstractions rather than depending on a real interactive terminal.
- Cover both expected results and relevant edge cases when modifying prompt behavior.

## Useful references

- `docs/guides/contributing.md` — contribution workflow and style expectations.
- `docs/guides/architecture.md` — prompt lifecycle and core design.
- `docs/guides/testing.md` — testing and simulated input guidance.
- `package.json` and `.github/workflows/bun-ci.yml` — available scripts and CI checks.