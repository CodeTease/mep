# Creating Custom Prompts

Mep allows you to create custom prompts by extending the base `Prompt` class. This gives you full control over rendering and input handling.

## Basic Structure

```typescript
import { Prompt } from 'mepcli/dist/base'; // or src/base if local
import { MepCLI } from 'mepcli';

interface MyPromptOptions {
    message: string;
}

export class MyPrompt extends Prompt<string, MyPromptOptions> {
    
    constructor(options: MyPromptOptions) {
        super(options);
        // Initialize state here
    }

    // Handle keypress events
    public async handleKey(key: any): Promise<void> {
        if (key.name === 'return') {
            this.submit(); // Resolve the promise
        } else if (key.name === 'c' && key.ctrl) {
            this.cancel(); // Reject/Exit
        } else {
            // Update state based on input
            this.value += key.sequence;
            this.render(); // Re-draw
        }
    }

    // Render the prompt to the string buffer
    public render(): void {
        const { message } = this.options;
        const prefix = MepCLI.theme.prefix; // Access theme
        
        // Output lines to the screen
        this.out.write(`${prefix} ${message} ${this.value}`);
    }
}
```

## Lifecycle Methods

- `constructor(options)`: Setup initial state.
- `start()`: Called when the prompt begins. Starts listening to stdin.
- `render()`: Called to draw the UI.
- `handleKey(key)`: Called on every keypress.
- `submit()`: Finalizes the prompt and resolves the promise.
- `clear()`: Clears the rendered output (optional).
