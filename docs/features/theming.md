# Theming

Mep allows you to customize the colors and styles of your prompts to match your brand or preference.

The theme configuration is stored in `MepCLI.theme`.

## Default Theme

The default theme provides a balanced color palette:

```typescript
export const theme = {
  main: ANSI.FG_CYAN, // Primary highlight color
  success: ANSI.FG_GREEN, // Success messages
  error: ANSI.FG_RED, // Error messages
  muted: ANSI.FG_GRAY, // Muted text (placeholders, hints)
  title: ANSI.RESET, // Prompt titles/messages
  // ...syntax highlighting colors
};
```

## Customizing the Theme

You can override the static `theme` property on `MepCLI` before running any prompts.

```typescript
import { ANSI, MepCLI } from "mepcli";

// Override specific theme keys
MepCLI.theme = {
  ...MepCLI.theme,
  main: ANSI.FG_YELLOW,
  title: ANSI.FG_BLUE,
};

// Now all prompts will use the new colors
await MepCLI.text({ message: "This title is now blue!" });
```

Assigning to `MepCLI.theme` updates the shared theme in place, so the values are
applied to every prompt on its next render. Mutating individual keys, such as
`MepCLI.theme.main = ANSI.FG_YELLOW`, works too.

## Syntax Highlighting

For code-based prompts (like `MepCLI.code` or `MepCLI.inspector`), the theme also defines syntax highlighting colors:

```typescript
MepCLI.theme.syntax = {
  ...MepCLI.theme.syntax,
  key: ANSI.FG_BLUE,
  string: ANSI.FG_GREEN,
  number: ANSI.FG_YELLOW,
  boolean: ANSI.FG_MAGENTA,
  null: ANSI.FG_RED,
  punctuation: ANSI.FG_WHITE,
};
```

## Related

- [Creating Custom Prompts](../guides/custom-prompts.md)
- [Rich UI Prompts](../prompts/rich-ui.md)
