# Testing

Mep prompts are designed to be testable. The library uses an internal abstraction over `stdin` and `stdout` which allows for mocking user input during tests.

## Setting up Tests

You can use frameworks like Jest or Vitest.

```typescript
import { MepCLI } from 'mepcli';
import { TextPrompt } from 'mepcli/dist/prompts/text';

describe('TextPrompt', () => {
    
    it('should return user input', async () => {
        // 1. Instantiate the prompt
        const prompt = new TextPrompt({ message: 'Name?' });

        // 2. Start the prompt in a non-blocking way
        const promise = prompt.run();

        // 3. Simulate input
        prompt.input.emit('keypress', 'Alice');
        prompt.input.emit('submit'); // Enter key

        // 4. Assert result
        const result = await promise;
        expect(result).toBe('Alice');
    });

});
```

## Mocking Keys

When writing tests, you often need to simulate specific key combinations (like arrow keys).

```typescript
// Simulate Down Arrow
prompt.input.emit('keypress', undefined, { name: 'down' });

// Simulate Space
prompt.input.emit('keypress', ' ', { name: 'space' });
```

## Related

- [Contributing](./contributing.md)
- [Input Validation](../features/validation.md)
