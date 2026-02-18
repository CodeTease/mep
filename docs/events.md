# Events

While Mep handles most input events internally for prompts, it exposes utilities for lower-level interaction.

## MepCLI.keypress

The `keypress` prompt is useful for "Press any key to continue" scenarios or detecting specific key combinations.

### Basic Usage

```typescript
console.log('Press any key to start...');
const key = await MepCLI.keypress({});
console.log(`You pressed: ${key}`);
```

### Filtering Keys

You can restrict input to specific keys using the `keys` option (though `keypress` is primarily for detection, `Confirm` or `Select` are better for specific choices).

## Key Handling in Prompts

Internally, Mep prompts listen to Node.js `keypress` events.

- **Enter**: Submit.
- **Ctrl+C**: Cancel/Exit (Throws an error or exits process).
- **Tab / Shift+Tab**: Navigation (in Forms, Grids, etc.).
- **Arrow Keys**: Navigation.
- **Space**: Toggle selection (Checkbox, MultiSelect).
- **Backspace/Delete**: Edit text.

When implementing custom prompts (see Advanced section), you will override the `handleKey` method to define how your prompt responds to these events.
