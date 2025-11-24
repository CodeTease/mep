# Mep

**Mep** is a minimalist and zero-dependency library for creating interactive command-line prompts in Node.js. It focuses on simplicity, modern design, and robust input handling, including support for cursor movement and input validation.

## Features

- **Zero Dependency:** Keeps your project clean and fast.
- **Comprehensive Prompts:** Includes `text`, `password`, `select`, `checkbox`, `confirm`, `number`, `toggle`, `list`, `slider`, `date`, `file`, and `multiSelect`.
- **Responsive Input:** Supports cursor movement (Left/Right) and character insertion/deletion in text-based prompts.
- **Validation:** Built-in support for input validation (sync and async) with custom error messages.
- **Elegant Look:** Uses ANSI colors for a clean, modern CLI experience.

## Installation

```bash
npm install mepcli
# or
yarn add mepcli
```

## Usage Example

Mep provides a static class facade, `MepCLI`, for all interactions.

```typescript
import { MepCLI } from 'mepcli';

async function main() {
    // Text input with validation
    const name = await MepCLI.text({
        message: "Enter your name:",
        placeholder: "John Doe",
        validate: (v) => v.length > 0 || "Name cannot be empty"
    });

    // Number input
    const age = await MepCLI.number({
        message: "How old are you?",
        min: 1,
        max: 120
    });

    // Toggle (Switch)
    const newsletter = await MepCLI.toggle({
        message: "Subscribe to newsletter?",
        initial: true
    });

    // Select menu
    const lang = await MepCLI.select({
        message: "Preferred Language:",
        choices: [
            { title: "JavaScript", value: "js" },
            { title: "TypeScript", value: "ts" },
            { title: "Python", value: "py" }
        ]
    });

    // Checkbox (Multiple choice)
    const tools = await MepCLI.checkbox({
        message: "Select tools:",
        choices: [
            { title: "ESLint", value: "eslint" },
            { title: "Prettier", value: "prettier", selected: true },
            { title: "Jest", value: "jest" }
        ]
    });

    console.log({ name, age, newsletter, lang, tools });
}

main();
```

## API Reference

### MepCLI

*   `text(options)` - Single line or multiline text input.
*   `password(options)` - Masked text input.
*   `number(options)` - Numeric input with increment/decrement support.
*   `confirm(options)` - Yes/No question.
*   `toggle(options)` - On/Off switch.
*   `select(options)` - Single item selection from a list.
*   `multiSelect(options)` - Multiple item selection with filtering.
*   `checkbox(options)` - Classic checkbox selection.
*   `list(options)` - Enter a list of tags/strings.
*   `slider(options)` - Select a number within a range using a visual slider.
*   `date(options)` - Date and time picker.
*   `file(options)` - File system navigator and selector.
*   `spin(message, promise)` - Display a spinner while waiting for a promise.

## License

This project is under the **MIT License**.
