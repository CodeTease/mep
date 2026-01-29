# Mep

**Mep** is a minimalist and zero-dependency library for creating interactive command-line prompts in Node.js. It focuses on simplicity, modern design, and robust input handling, including support for cursor movement and input validation.

## Features

- **Zero Dependency:** Keeps your project clean and fast.
- **Comprehensive Prompts:** Includes `text`, `password`, `select`, `checkbox`, `confirm`, `number`, `toggle`, `list`, `slider`, `date`, `file`, `multiSelect`, `autocomplete`, `sort`, `table`, `rating`, `editor`, `tree`, and `keypress`.
- **Mouse Support:** Built-in support for mouse interaction (SGR 1006 protocol). Scroll to navigate lists or change values; click to select.
- **Responsive Input:** Supports cursor movement (Left/Right) and character insertion/deletion in text-based prompts.
- **Validation:** Built-in support for input validation (sync and async) with custom error messages.
- **Elegant Look:** Uses ANSI colors for a clean, modern CLI experience.

## Installation

```shell
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

    // Rating (Star rating)
    const stars = await MepCLI.rating({
        message: "Rate your experience:",
        min: 1,
        max: 5,
        initial: 5
    });

    // Autocomplete (Search)
    const city = await MepCLI.autocomplete({
        message: "Search for a city:",
        suggest: async (query) => {
            const cities = [
                { title: "New York", value: "NY" },
                { title: "London", value: "LDN" },
                { title: "Paris", value: "PAR" }
            ];
            return cities.filter(c => c.title.toLowerCase().includes(query.toLowerCase()));
        }
    });

    // Sort (Drag & Drop)
    const priorities = await MepCLI.sort({
        message: "Rank priorities:",
        items: ["Speed", "Quality", "Cost"]
    });

    // Table (Data selection)
    const user = await MepCLI.table({
        message: "Select a user:",
        columns: ["ID", "Name"],
        data: [
            { value: 1, row: ["001", "Alice"] },
            { value: 2, row: ["002", "Bob"] }
        ]
    });

    // Editor (External text editor)
    const bio = await MepCLI.editor({
        message: "Write your biography:",
        extension: ".md"
    });

    // Form (Multi-field input)
    const userDetails = await MepCLI.form({
        message: "User Details:",
        fields: [
            { name: "firstname", message: "First Name", initial: "John" },
            { name: "lastname", message: "Last Name", validate: (v) => v.length > 0 ? true : "Required" },
            { name: "email", message: "Email", validate: (v) => v.includes("@") || "Invalid email" }
        ]
    });

    // Snippet (Template filling)
    const commitMsg = await MepCLI.snippet({
        message: "Commit Message:",
        template: "feat(${scope}): ${message}",
        values: {
            scope: "core"
        }
    });

    // Code Prompt (JSON/YAML Editing)
    const config = await MepCLI.code({
        message: "Configure Server:",
        language: "json",
        template: `
{
  "host": "\${host}",
  "port": \${port},
  "debug": \${debug}
}
`
    });

    // Masked Input (Pattern enforcement)
    const phone = await MepCLI.mask({
        message: "Enter Phone Number:",
        mask: "(999) 999-9999",
        placeholder: "_"
    });

    // Tree Select (Hierarchical Multi-Select)
    const selectedFiles = await MepCLI.treeSelect({
        message: "Select files to backup:",
        data: [
            {
                title: "src",
                value: "src",
                children: [
                    { title: "index.ts", value: "src/index.ts" },
                    { title: "utils.ts", value: "src/utils.ts" }
                ]
            }
        ]
    });

    console.log({ name, age, newsletter, lang, tools, stars, city, priorities, user, bio, userDetails, commitMsg, config, phone, selectedFiles });
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
*   `rating(options)` - Star rating input.
*   `date(options)` - Date and time picker.
*   `file(options)` - File system navigator and selector.
*   `autocomplete(options)` - Searchable selection with async suggestions.
*   `sort(options)` - Reorder a list of items.
*   `table(options)` - Display data in columns and select rows.
*   `tree(options)` - Navigate and select from a hierarchical tree structure.
*   `keypress(options)` - Wait for a specific key press or any key.
*   `editor(options)` - Launch an external editor (Vim, Nano, Notepad, etc.) to capture multi-line content.
*   `form(options)` - Multi-field input form with navigation.
*   `snippet(options)` - Template string filling with variable navigation.
*   `code(options)` - Edit variables within a code block (JSON/YAML). Syntax highlighting is supported (Experimental).
*   `mask(options)` - Input text with a fixed pattern mask (e.g., phone numbers, IP addresses).
*   `treeSelect(options)` - Hierarchical multi-selection with cascading checkboxes.
*   `spam(options)` - Confirm a dangerous action or fun.
*   `wait(options)` - Wait for a specified number of seconds.
*   `spinner(message)` - Returns a `Spinner` instance for manual control (`start`, `stop`, `update`, `success`, `error`).

## Mouse Support

MepCLI automatically detects modern terminals and enables **Mouse Tracking** (using SGR 1006 protocol).

*   **Scrolling:**
    *   `select`, `multiSelect`, `checkbox`, `autocomplete`, `table`, `tree`: Scroll to navigate the list.
    *   `form`, `snippet`: Scroll to navigate between fields.
    *   `number`, `slider`, `rating`, `date`: Scroll to increment/decrement values or fields.
    *   `sort`: Scroll to navigate or reorder items (when grabbed).
    *   `toggle`, `confirm`: Scroll to toggle the state.
*   **Configuration:**
    *   Mouse support is enabled by default if the terminal supports it.
    *   You can explicitly disable it per prompt by setting `mouse: false` in the options.

## License

This project is under the **MIT License**.
