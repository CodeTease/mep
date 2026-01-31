# Mep

**Mep** is a lightweight and zero-dependency library for creating interactive command-line prompts in Node.js. It focuses on simplicity, modern design, and robust input handling, including support for cursor movement and input validation.

A **CodeTease** project. 

## Features

- **Zero Dependency:** Keeps your project clean and fast.
- **Comprehensive Prompts:** Includes `text`, `password`, `secret`, `select`, `checkbox`, `confirm`, `number`, `toggle`, `list`, `slider`, `range`, `date`, `file`, `multiSelect`, `autocomplete`, `sort`, `transfer`, `cron`, `table`, `rating`, `editor`, `tree`, `keypress`, `color`, `grid`, `calendar`, `map`, `semver`, `ip`, `otp`, `quizSelect`, `quizText`, `kanban`, `time`, and `heatmap`.
- **Mouse Support:** Built-in support for mouse interaction (SGR 1006 protocol). Scroll to navigate lists or change values.
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

    // Color (RGB Picker)
    const color = await MepCLI.color({
        message: "Choose theme color:",
        initial: "#3B82F6"
    });

    // Grid (Matrix Selection)
    const permissions = await MepCLI.grid({
        message: "Manage Permissions:",
        rows: ["Admin", "User", "Guest"],
        columns: ["Read", "Write", "Delete"]
    });

    // Calendar (Date/Range Picker)
    const booking = await MepCLI.calendar({
        message: "Select dates:",
        mode: "range"
    });

    // Map (Key-Value Editor)
    const envVars = await MepCLI.map({
        message: "Edit Environment Variables:",
        initial: { "API_URL": "http://localhost:3000", "DEBUG": "true" }
    });

    // IP Address (v4)
    const serverIp = await MepCLI.ip({
        message: "Enter Server IP:",
        initial: "192.168.1.1"
    });

    // OTP (Masked PIN input)
    const pin = await MepCLI.otp({
        message: "Enter Verification PIN:",
        length: 4,
        mask: "•",
        secure: true
    });

    // Quiz Select (Interactive Multiple Choice)
    const capital = await MepCLI.quizSelect({
        message: "What is the capital of France?",
        choices: [
            { title: "London", value: "london" },
            { title: "Paris", value: "paris" },
            { title: "Berlin", value: "berlin" }
        ],
        correctValue: "paris",
        explanation: "Paris is the capital and most populous city of France."
    });

    // Quiz Text (Interactive Text Answer)
    const answer = await MepCLI.quizText({
        message: "What is 2 + 2?",
        correctAnswer: "4",
        explanation: "Basic arithmetic."
    });

    // Kanban (Column/Card Management)
    const kanban = await MepCLI.kanban({
        message: "Prioritize Tasks:",
        columns: [
            { id: "todo", title: "To Do", items: [{ id: "1", title: "Fix Bugs" }] },
            { id: "doing", title: "In Progress", items: [{ id: "2", title: "Write Docs" }] },
            { id: "done", title: "Done", items: [] }
        ]
    });

    // Time (Vertical Scroller)
    const time = await MepCLI.time({
        message: "Select meeting time:",
        format: "12h",
        step: 15
    });

    // Heatmap (Grid Intensity)
    const activity = await MepCLI.heatmap({
        message: "Weekly Activity:",
        rows: ["Mon", "Tue", "Wed"],
        columns: ["Morning", "Afternoon", "Evening"],
        legend: [
             { value: 0, char: ".", color: (s) => s },
             { value: 1, char: "x", color: (s) => `\x1b[32m${s}\x1b[0m` } // Green
        ]
    });

    // SemVer (Version Bump)
    const nextVersion = await MepCLI.semver({
        message: "Bump version:",
        currentVersion: "1.0.2"
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

    // Code Prompt (JSON Editing)
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

    console.log({ name, age, newsletter, lang, tools, stars, city, priorities, user, color, permissions, booking, envVars, serverIp, nextVersion, bio, userDetails, commitMsg, config, selectedFiles });
}

main();
```

## API Reference

### MepCLI

*   `text(options)` - Single line or multiline text input.
*   `password(options)` - Masked text input.
*   `secret(options)` - Completely hidden text input.
*   `number(options)` - Numeric input with increment/decrement support.
*   `confirm(options)` - Yes/No question.
*   `toggle(options)` - On/Off switch.
*   `select(options)` - Single item selection from a list.
*   `multiSelect(options)` - Multiple item selection with filtering.
*   `checkbox(options)` - Classic checkbox selection.
*   `list(options)` - Enter a list of tags/strings.
*   `slider(options)` - Select a number within a range using a visual slider.
*   `range(options)` - Select a numerical range (min/max) using a dual-handle slider.
*   `rating(options)` - Star rating input.
*   `date(options)` - Date and time picker.
*   `color(options)` - RGB color picker with hex output and TrueColor preview.
*   `grid(options)` - 2D matrix selection (rows x columns).
*   `calendar(options)` - Interactive monthly calendar for single dates or ranges.
*   `map(options)` - Key-Value editor with grid navigation.
*   `semver(options)` - Version bumping utility.
*   `ip(options)` - IPv4 address input with auto-jump.
*   `otp(options)` - Masked fixed-length input (PIN/OTP) with auto-submit.
*   `quizSelect(options)` - Multiple choice quiz with immediate feedback/reveal.
*   `quizText(options)` - Text answer quiz with validation and feedback.
*   `kanban(options)` - Move items between multiple columns (Drag & Drop).
*   `time(options)` - Vertical time scroller with rollover logic.
*   `heatmap(options)` - Grid intensity selector with custom legend.
*   `file(options)` - File system navigator and selector.
*   `autocomplete(options)` - Searchable selection with async suggestions.
*   `sort(options)` - Reorder a list of items.
*   `transfer(options)` - Move items between two lists (Source/Target).
*   `cron(options)` - Visually build a cron schedule (Minute, Hour, Day, Month, Weekday).
*   `table(options)` - Display data in columns and select rows.
*   `tree(options)` - Navigate and select from a hierarchical tree structure.
*   `keypress(options)` - Wait for a specific key press or any key.
*   `editor(options)` - Launch an external editor (Vim, Nano, Notepad, etc.) to capture multi-line content.
*   `form(options)` - Multi-field input form with navigation.
*   `snippet(options)` - Template string filling with variable navigation.
*   `code(options)` - Edit variables within a code block (JSON). Syntax highlighting is supported (Experimental).
*   `treeSelect(options)` - Hierarchical multi-selection with cascading checkboxes.
*   `spam(options)` - Confirm a dangerous action or fun.
*   `wait(options)` - Wait for a specified number of seconds.
*   `spinner(message)` - Returns a `Spinner` instance for manual control (`start`, `stop`, `update`, `success`, `error`).

## Mouse Support

MepCLI automatically detects modern terminals and enables **Mouse Tracking** (using SGR 1006 protocol).

*   **Scrolling:**
    *   `select`, `multiSelect`, `checkbox`, `autocomplete`, `table`, `tree`, `transfer`: Scroll to navigate the list.
    *   `form`, `snippet`, `cron`: Scroll to navigate between fields or values.
    *   `number`, `slider`, `range`, `rating`, `date`: Scroll to increment/decrement values or fields.
    *   `sort`: Scroll to navigate or reorder items (when grabbed).
    *   `toggle`, `confirm`: Scroll to toggle the state.
    *   `calendar`: Scroll to switch months.
    *   `color`: Scroll to adjust RGB channels.
    *   `grid`, `heatmap`, `kanban`: Scroll to move selection.
    *   `time`: Scroll to adjust values.
*   **Configuration:**
    *   Mouse support is enabled by default if the terminal supports it.
    *   You can explicitly disable it per prompt by setting `mouse: false` in the options.

## Advanced Shortcuts

### Calendar Prompt

Mep's Calendar prompt supports advanced navigation and selection shortcuts for power users.

*   **Keyboard:**
    *   `Arrow Keys`: Move cursor day by day.
    *   `PageUp` / `PageDown`: Jump to previous/next **Month**.
    *   `Ctrl + Up` / `Ctrl + Down`: Jump to previous/next **Year**.
    *   `Home` / `End`: Jump to the first/last day of the current month.
    *   `t`: Jump immediately to **Today**.
    *   `Enter`: Select date (or start/end of range).

*   **Mouse:**
    *   `Scroll`: Navigate **Months**.
    *   `Ctrl + Scroll`: Adjust the selected **Day** (cursor movement).

### Color Prompt

*   **Keyboard:**
    *   `Tab`: Switch between RGB channels.
    *   `Up` / `Down`: Move between channels.
    *   `Left` / `Right`: Adjust current channel value.
    *   `Shift + Left` / `Shift + Right`: Fast adjust current channel value.

*   **Mouse:**
    *   `Scroll`: Adjust the current channel value.
    *   `Ctrl + Scroll`: Fast adjust.

### Checkbox Prompt

*   **Keyboard:**
    *   `Space`: Toggle selection.
    *   `a`: Select **All**.
    *   `x` / `n`: Select **None**.
    *   `i`: **Invert** selection.

### MultiSelect Prompt

*   **Keyboard:**
    *   `Space`: Toggle selection.
    *   `Ctrl + A`: Select **All** (Visible).
    *   `Ctrl + X`: Deselect **All** (Visible).
    *   `Typing`: Filter list.

### Transfer Prompt

*   **Keyboard:**
    *   `Tab` / `Left` / `Right`: Switch focus between Source and Target.
    *   `Space`: Move selected item.
    *   `a` / `>`: Move **All** to Target.
    *   `r` / `<`: Move **All** to Source (Reset).

### Tree & TreeSelect Prompt

*   **Keyboard:**
    *   `Right`: Expand folder or jump to child.
    *   `Left`: Collapse folder or jump to parent.
    *   `Space`: Toggle expansion (Tree) or Checkbox (TreeSelect).
    *   `e`: **Expand** all recursively.
    *   `c`: **Collapse** all recursively.

### Grid Prompt

The Grid prompt (Matrix selection) includes robust shortcuts for bulk actions.

*   **Keyboard:**
    *   `Arrow Keys`: Move cursor.
    *   `PageUp` / `PageDown`: Jump to the first/last **Row**.
    *   `Home` / `End`: Jump to the first/last **Column**.
    *   `Space`: Toggle current cell.
    *   `r`: Toggle entire **Row**.
    *   `c`: Toggle entire **Column**.
    *   `a`: Select **All**.
    *   `x`: Deselect **All** (None).
    *   `i`: **Invert** selection.

*   **Mouse:**
    *   `Scroll`: Vertical navigation (Rows).
    *   `Shift + Scroll`: Horizontal navigation (Columns).

### Map Prompt

*   **Keyboard:**
    *   `Ctrl + N`: Add new row.
    *   `Ctrl + D`: Delete current row.
    *   `Arrows` / `Tab`: Navigate cells.

### IP Prompt

*   **Keyboard:**
    *   `typing...`: Auto-jumps to next octet after 3 digits or `.`.
    *   `Backspace`: Navigates back to previous octet if empty.

### Kanban Prompt

*   **Keyboard:**
    *   `Arrows`: Navigate items/columns.
    *   `Space`: Grab/Drop item (Drag & Drop mode).
    *   `Enter`: Submit.

### Time Prompt

*   **Keyboard:**
    *   `Up` / `Down`: Adjust value.
    *   `Left` / `Right` / `Tab`: Switch unit (Hour/Minute/AM-PM).

### Heatmap Prompt

*   **Keyboard:**
    *   `Arrows`: Navigate cells.
    *   `Space`: Cycle value.
    *   `0-9`: Set value directly.

## License

This project is under the **MIT License**.
