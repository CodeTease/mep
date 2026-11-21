# Spinner

The Spinner utility provides a simple way to indicate background activity to the user.

## Usage

```typescript
import { MepCLI } from "mepcli";

const spinner = MepCLI.spinner("Loading resources...");

spinner.start();

// Simulate work
await new Promise((resolve) => setTimeout(resolve, 2000));

spinner.stop("Resources loaded!", "success");
```

## API

### `MepCLI.spinner(message: string)`

Creates a new spinner instance.

### `spinner.start()`

Starts the animation loop.

While running, the spinner hides the cursor and listens for `SIGINT`. On
Ctrl+C it restores the cursor, lets any other `SIGINT` listeners run, and only
terminates the process asynchronously with status `130` when it is the sole
listener and no exit code has been set.

If stdout is a pipe whose reader goes away (for example `| head`), the spinner
stops on the resulting `EPIPE`/`ERR_STREAM_DESTROYED` error instead of letting
it crash the process. Later `stop()` calls are no-ops because there is nothing
left to write to.

### `spinner.stop(message?: string, type?: 'success' | 'error' | 'info')`

Stops the animation and replaces the line with a final message, then terminates
the line with a newline so output written afterwards starts on a fresh line.

- `message` defaults to the spinner's current text.
- `type` adds a styled prefix: `success` (`✔`), `error` (`✖`), or `info` (`ℹ`).
- Calling `stop()` when the spinner is not running does nothing.

```typescript
spinner.stop(); // finish the line with the current text
spinner.stop("Resources loaded!"); // custom message, no prefix
spinner.stop("Resources loaded!", "success"); // ✔ Resources loaded!
spinner.stop("Upload failed", "error"); // ✖ Upload failed
spinner.stop("Nothing to do", "info"); // ℹ Nothing to do
```

### `spinner.success(message?: string)`

Stops the spinner and replaces the line with a success message (defaults to the
current text).

### `spinner.error(message?: string)`

Stops the spinner and replaces the line with an error message (defaults to the
current text).

### `spinner.clear()`

Stops the spinner and clears the line without writing a newline.

## Related

- [Task Runner](./task-runner.md)
- [Basic Input Prompts](../prompts/basic-inputs.md)
