# Mep: Minimalist CLI Prompt

**Mep** is a minimalist and zero-dependency library for creating interactive command-line prompts in Node.js. (The name "Mep" is purely an identifier and not an acronym). It focuses on simplicity, modern design, and robust input handling, including support for cursor movement and input validation.

## Features

- **Zero Dependency:** Keeps your project clean and fast.
- **Full-Featured Prompts:** Includes `text`, `password`, `select`, ch`eckbox, and `confirm`.
- **Responsive Input:** Supports cursor movement (Left/Right) and character insertion/deletion in `text` and `password` prompts.
- **Validation:** Built-in support for input validation with custom error messages.
- **Elegant Look:** Uses ANSI colors for a clean, modern CLI experience.

## Installation

```bash
npm install mep
# or
yarn add mep
```

## Usage Example

Mep provides a static class facade, `MepCLI`, for all interactions.
```javascript
import { MepCLI } from 'mep';

async function setup() {
    // Text input with validation and cursor support
    const projectName = await MepCLI.text({
        message: "Enter the project name:",
        validate: (v) => v.length > 5 || "Must be longer than 5 chars",
    });

    // Select menu
    const choice = await MepCLI.select({
        message: "Choose an option:",
        choices: [
            { title: "Option A", value: 1 },
            { title: "Option B", value: 2 }
        ]
    });

    console.log(`\nProject: ${projectName}, Selected: ${choice}`);
}

setup();
```

## License

This project is under the **MIT License**.