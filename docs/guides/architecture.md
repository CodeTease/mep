# Architecture

Mep operates directly on `process.stdin` and `process.stdout` to render interactive prompts.

## Core Concepts

### The Prompt Lifecycle

1.  **Instantiation**: A prompt class (e.g., `TextPrompt`) is instantiated with options.
2.  **Rendering**: The prompt enters a render loop. It uses ANSI escape codes to clear the previous frame and draw the current state.
3.  **Input Handling**: The prompt listens to `keypress` events on `stdin`. It intercepts raw input, processes it (updating state), and triggers a re-render.
4.  **Submission**: When the user submits (usually via `Enter`), the loop stops, the final state is rendered (or cleared), and the promise resolves with the value.

### Zero Dependencies

Mep implements its own ANSI handling, cursor movement, and color functions. This ensures the library remains lightweight and free from supply chain attacks or version conflicts common with heavy dependency trees.

### Type Safety

Every prompt is a generic class that enforces type safety on its return value. For example, `SelectPrompt<T>` ensures the resolved value matches the type of the `value` property in your choices.

## Related

- [Creating Custom Prompts](./custom-prompts.md)
- [Contributing](./contributing.md)
