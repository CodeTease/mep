# Theming

Mep allows you to customize the colors and styles of your prompts to match your brand or preference.

The theme configuration is stored in `MepCLI.theme`.

## Default Theme

The default theme provides a balanced color palette:

```typescript
export const theme = {
    main: (text: string) => cyan(text), // Primary highlight color
    success: (text: string) => green(text), // Success messages
    error: (text: string) => red(text), // Error messages
    muted: (text: string) => gray(text), // Muted text (placeholders, hints)
    title: (text: string) => white(text), // Prompt titles/messages
    // ...syntax highlighting colors
};
```

## Customizing the Theme

You can override the static `theme` property on `MepCLI` before running any prompts.

```typescript
import { MepCLI } from 'mepcli';
import { yellow, blue, red } from 'mepcli/dist/ansi'; // or your own color functions

// Override specific theme keys
MepCLI.theme = {
    ...MepCLI.theme,
    main: (t) => yellow(t),
    title: (t) => blue(t),
};

// Now all prompts will use the new colors
await MepCLI.text({ message: 'This title is now blue!' });
```

## Syntax Highlighting

For code-based prompts (like `MepCLI.code` or `MepCLI.inspector`), the theme also defines syntax highlighting colors:

```typescript
MepCLI.theme.syntax = {
    key: (t) => blue(t),
    string: (t) => green(t),
    number: (t) => yellow(t),
    boolean: (t) => magenta(t),
    null: (t) => red(t),
    punctuation: (t) => white(t),
};
```
