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

## Mouse Events

When mouse tracking is enabled (either globally or explicitly inside a prompt via configuration `mouse: true`), Mep captures terminal mouse events and passes them down.

A `MouseEvent` object is structured as follows:

```typescript
export interface MouseEvent {
    name: 'mouse';
    x: number;       // Terminal column
    y: number;       // Terminal row
    button: number;  // 0: Left, 1: Middle, 2: Right
    action: 'press' | 'release' | 'move' | 'scroll';
    scroll?: 'up' | 'down';
    shift?: boolean;
    ctrl?: boolean;
    meta?: boolean;
}
```

To enable scrolling or clicking in a custom prompt (like a custom selection list), override the `handleMouse(event: MouseEvent)` method and update your state accordingly:

```typescript
protected handleMouse(event: MouseEvent) {
    if (event.action === 'scroll') {
        if (event.scroll === 'up') {
            // Scroll selection list up
            this.selectedIndex = Math.max(0, this.selectedIndex - 1);
            this.render(false);
        } else if (event.scroll === 'down') {
            // Scroll selection list down
            this.selectedIndex = Math.min(this.options.choices.length - 1, this.selectedIndex + 1);
            this.render(false);
        }
    } else if (event.action === 'press' && event.button === 0) {
        // Left click: Calculate the clicked item based on the Y coordinate
        // Assuming the list UI starts right after the prompt message on line 1
        const clickedIndex = event.y - 1; 
        
        if (clickedIndex >= 0 && clickedIndex < this.options.choices.length) {
            this.selectedIndex = clickedIndex;
            // Immediately select the item and submit
            this.submit(this.options.choices[this.selectedIndex].value);
        }
    }
}
```

When implementing custom prompts (see Advanced section), you will override the `handleInput` and optionally `handleMouse` methods to define how your prompt responds to user interaction.

## Related

- [Rich UI Prompts](../prompts/rich-ui.md)
- [Keyboard Shortcuts](./shortcuts.md)
