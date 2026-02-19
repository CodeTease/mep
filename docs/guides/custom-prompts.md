# Creating Custom Prompts

Mep allows you to create custom prompts by extending the base `Prompt` class. This gives you full control over rendering and input handling.

## Basic Structure

```typescript
import { Prompt } from 'mepcli/dist/base'; // or src/base if local
import { ANSI } from 'mepcli/dist/ansi';
import { MouseEvent } from 'mepcli/dist/types';

interface MyPromptOptions {
    message: string;
}

export class MyPrompt extends Prompt<string, MyPromptOptions> {
    
    constructor(options: MyPromptOptions) {
        super(options);
        this.value = '';
    }

    // Handle keypress events
    protected handleInput(char: string, key: Buffer): void {
        if (char === '\r' || char === '\n') {
            this.submit(this.value); // Resolve the promise
        } else if (char === '\u0003') {
            this.cancel('User cancelled'); // Ctrl+C
        } else if (!/^[\x00-\x1F]/.test(char)) { // Typeable characters
            // Update state based on input
            this.value += char;
            this.render(false); // Re-draw
        }
    }

    // Handle mouse events (Optional)
    protected handleMouse(event: MouseEvent): void {
        if (event.action === 'scroll') {
             // Example: Handle scroll interaction conceptually 
             // ... update internal scroll offset ...
             this.render(false);
        }
    }

    // Render the prompt to the string buffer
    protected render(firstRender: boolean): void {
        const { message } = this.options;
        const prefix = `[?]`; // Access theme if needed
        
        // Pass the output string to the engine which handles diffing and drawing
        // Do NOT use console.log here.
        this.renderFrame(`${prefix} ${message} ${this.value}`);
    }
}
```

## Lifecycle Methods

- `constructor(options)`: Setup initial state.
- `run()`: Started by MepCLI automatically when prompt is awaited. Begins listening to stdin.
- `render(firstRender: boolean)`: Called dynamically to draw the UI using the diffing engine.
- `handleInput(char: string, key: Buffer)`: Called on every keyboard event.
- `handleMouse(event: MouseEvent)`: Called on mouse interactions (if tracking is enabled).
- `submit(result)`: Finalizes the prompt, cleans up terminals, and resolves the promise.
- `cancel(reason)`: Cleans up and rejects the promise.
- `cleanup()`: Restores terminal state (re-enables cursors, disables raw mode & mouse tracking).

## Related

- [Architecture](./architecture.md)
- [Theming](../features/theming.md)
