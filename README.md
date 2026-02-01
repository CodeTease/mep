# Mep

**Mep** is a lightweight and zero-dependency library for creating interactive command-line prompts in Node.js. It focuses on simplicity, modern design, and robust input handling, including support for cursor movement and input validation. With over 60+ built-in prompt types, Mep is ideal for building rich CLI applications, installers, and configuration wizards.

A **CodeTease** project. 

## Features

- **Zero Dependency:** Keeps your project clean and fast.
- **Comprehensive Prompts:** Includes `text`, `password`, `secret`, `select`, `checkbox`, `confirm`, `number`, `toggle`, `list`, `slider`, `range`, `date`, `file`, `breadcrumb`, `multiSelect`, `multiColumnSelect`, `fuzzySelect`, `miller`, `autocomplete`, `sort`, `transfer`, `cron`, `table`, `rating`, `editor`, `tree`, `keypress`, `color`, `grid`, `calendar`, `map`, `semver`, `ip`, `otp`, `quizSelect`, `quizText`, `kanban`, `time`, `byte`, `heatmap`, `slot`, `gauge`, `calculator`, `emoji`, `match`, `diff`, `dial`, `draw`, `scroll`, `schedule`, `inspector`, `exec`, `shortcut`, and `seat`.
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

    // Breadcrumb Navigation
    const projectDir = await MepCLI.breadcrumb({
        message: "Navigate to folder:",
        root: process.cwd(),
        showHidden: false
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

    // Slot Machine (Random Selection)
    const winner = await MepCLI.slot({
        message: "Spin for a prize:",
        choices: ["🍒 Cherry", "🍋 Lemon", "🍊 Orange", "💎 Diamond"],
        rows: 3
    });

    // Rhythm Gauge (Timing Game)
    const accuracy = await MepCLI.gauge({
        message: "Hit the green zone!",
        width: 40,
        safeZone: 0.2 // 20% width
    });

    // Calculator (Math Expression)
    const result = await MepCLI.calculator({
        message: "Calculate total:",
        initial: "price * qty",
        variables: { price: 25, qty: 4 },
        precision: 2
    });

    // Emoji (Grid Selection)
    const icon = await MepCLI.emoji({
        message: "Select an icon:",
        emojis: [
            { char: "😀", name: "Smile" },
            { char: "🚀", name: "Rocket" }
        ],
        recent: ["Rocket"]
    });

    // Match (Link Items)
    const links = await MepCLI.match({
        message: "Match Capital to Country:",
        source: ["Paris", "Berlin"],
        target: ["Germany", "France"],
        constraints: { required: true }
    });

    // SemVer (Version Bump)
    const nextVersion = await MepCLI.semver({
        message: "Bump version:",
        currentVersion: "1.0.2"
    });

    // Diff (Conflict Resolver)
    const resolved = await MepCLI.diff({
        message: "Resolve Merge Conflict:",
        original: "function old() { return 1; }",
        modified: "function new() { return 2; }"
    });

    // Dial (Circular Knob)
    const volume = await MepCLI.dial({
        message: "Set Volume:",
        min: 0,
        max: 100,
        initial: 50
    });

    // Draw (Braille Canvas)
    const art = await MepCLI.draw({
        message: "Draw signature:",
        width: 20,
        height: 10
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

    // Multi-Column Select (Grid Layout)
    const tech = await MepCLI.multiColumnSelect({
        message: "Pick a technology:",
        choices: [
            { title: "React", value: "react" },
            { title: "Vue", value: "vue" },
            { title: "Angular", value: "angular" },
            { title: "Node", value: "node" }
        ],
        cols: 2
    });

    // Fuzzy Select (Approximate Search)
    const pkg = await MepCLI.fuzzySelect({
        message: "Search package:",
        choices: [
            { title: "react", value: "react" },
            { title: "react-dom", value: "react-dom" },
            { title: "redux", value: "redux" }
        ]
    });

    // Miller Columns (Hierarchical Navigation)
    const location = await MepCLI.miller({
        message: "Select Location:",
        data: [
            {
                title: "USA",
                value: "usa",
                children: [
                    { title: "California", value: "ca", children: [{ title: "SF", value: "sf" }] }
                ]
            }
        ]
    });

    // Pattern Lock
    const pattern = await MepCLI.pattern({
        message: "Draw a pattern:",
        rows: 3,
        cols: 3
    });

    // Region Selector
    const region = await MepCLI.region({
        message: "Select a region:",
        mapArt: "   ___\n__/   \\__\n\\_______/",
        regions: [{ id: "Base", label: "Base", x: 4, y: 1 }]
    });

    // Spreadsheet
    const sheet = await MepCLI.spreadsheet({
        message: "Edit Data:",
        columns: [{ name: "Name", key: "name" }, { name: "Role", key: "role" }],
        data: [{ name: "Alice", role: "Dev" }]
    });

    // Scroll (License Viewer)
    await MepCLI.scroll({
        message: "Read License:",
        content: "MIT License...\n(Lots of text here)",
        height: 10,
        requireScrollToBottom: true
    });

    // Schedule (Gantt Chart)
    const timeline = await MepCLI.schedule({
        message: "Project Timeline:",
        data: [
            { name: "Design", start: new Date("2023-01-01"), end: new Date("2023-01-05") },
            { name: "Code", start: new Date("2023-01-06"), end: new Date("2023-01-15") }
        ]
    });

    // Data Inspector (JSON Explorer)
    const configData = await MepCLI.inspector({
        message: "Edit Config:",
        data: {
            host: "localhost",
            port: 8080,
            features: { auth: true, logs: false }
        }
    });

    // Exec (Background Command)
    await MepCLI.exec({
        message: "Installing dependencies...",
        command: "npm install",
        timeout: 60000 // 60s timeout
    });

    // Shortcut (Keybinding Recorder)
    const keybind = await MepCLI.shortcut({
        message: "Press a key combination to bind:"
    });

    // Seat (Matrix Selection with Gaps)
    const seats = await MepCLI.seat({
        message: "Choose your seats:",
        layout: [
            "AAA_AAA",
            "AAA_AAA",
            "_______", // Walkway
            "BBBBBBB"
        ],
        multiple: true
    });

    // Select Range (Continuous Selection)
    const selectedRange = await MepCLI.selectRange({
        message: "Select a range of commits to squash:",
        choices: [
            { title: "feat: add user login", value: "c1" },
            { title: "fix: validation error", value: "c2" },
            { title: "docs: update readme", value: "c3" },
            { title: "chore: bump deps", value: "c4" }
        ],
        initial: [1, 2] // Start and End index
    });

    // Sort Grid (2D Reorder)
    const sortedGrid = await MepCLI.sortGrid({
        message: "Rearrange the dashboard widgets:",
        data: [
            ["Clock", "Weather"],
            ["Calendar", "Notes"]
        ]
    });

    console.log({ name, age, newsletter, lang, tools, stars, city, priorities, user, color, permissions, booking, envVars, serverIp, nextVersion, bio, userDetails, commitMsg, config, selectedFiles, tech, pkg, location, pattern, region, sheet, timeline, configData, keybind, seats, selectedRange, sortedGrid });
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
*   `multiColumnSelect(options)` - Single selection with grid layout.
*   `fuzzySelect(options)` - Single selection with fuzzy search.
*   `miller(options)` - Hierarchical navigation using Miller Columns.
*   `pattern(options)` - Grid-based pattern lock input.
*   `region(options)` - Select regions on an ASCII map.
*   `spreadsheet(options)` - Interactive table/spreadsheet editor.
*   `scroll(options)` - Scrollable viewport for long text content.
*   `schedule(options)` - Gantt-style timeline for viewing and editing task durations.
*   `inspector(options)` - Tree-view JSON explorer with in-place editing.
*   `exec(options)` - Run a shell command in the background with a minimalist status UI (Running/Success/Error).
*   `shortcut(options)` - Record raw key combinations (Ctrl/Alt/Shift + Key).
*   `seat(options)` - Select items from a 2D layout with gaps and "jump" navigation.
*   `selectRange(options)` - Select a continuous range of items from a list using an anchor.
*   `sortGrid(options)` - Rearrange items in a 2D grid using drag-and-drop.
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
*   `byte(options)` - Byte size input with unit suffixes (B, KB, MB, GB, TB, PB).
*   `slot(options)` - Visual slot machine for random selection.
*   `gauge(options)` - Timing-based gauge game for accuracy input.
*   `calculator(options)` - Evaluate mathematical expressions with real-time preview.
*   `emoji(options)` - Grid-based emoji selector with filtering and recent history.
*   `match(options)` - Link items between source and target columns.
*   `diff(options)` - Conflict resolver for comparing and merging text blocks.
*   `dial(options)` - Circular rotary knob for numeric input.
*   `draw(options)` - Drawing canvas using Braille characters.
*   `file(options)` - File system navigator and selector.
*   `breadcrumb(options)` - Stack-based file system navigator with breadcrumb trail.
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
    *   `grid`, `heatmap`, `kanban`, `emoji`: Scroll to move selection.
    *   `match`: Scroll independent columns.
    *   `time`: Scroll to adjust values.
    *   `scroll`: Scroll content up/down.
    *   `breadcrumb`: Scroll to navigate list.
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

*   **Mouse:**
    *   `Scroll`: Navigate items (Normal) or Move item Left/Right (Grabbed).

### Time Prompt

*   **Keyboard:**
    *   `Up` / `Down`: Adjust value.
    *   `Left` / `Right` / `Tab`: Switch unit (Hour/Minute/AM-PM).

*   **Mouse:**
    *   `Scroll`: Adjust value (Up/Down).

### Heatmap Prompt

*   **Keyboard:**
    *   `Arrows`: Navigate cells.
    *   `Tab` / `Shift+Tab`: Navigate cells (Horizontal).
    *   `Space`: Cycle value.
    *   `0-9`: Set value directly.

*   **Mouse:**
    *   `Scroll`: Navigate rows (Vertical).

### Emoji Prompt & MultiColumnSelect

*   **Keyboard:**
    *   `Arrows`: Navigate grid.
    *   `Typing`: Filter/Search (Emoji only).

### Miller Prompt

*   **Keyboard:**
    *   `Up` / `Down`: Navigate items.
    *   `Right` / `Enter` / `Tab`: Expand child or Drill down.
    *   `Left` / `Shift + Tab`: Collapse or Go back.

### Match Prompt

*   **Keyboard:**
    *   `Arrows`: Navigate lists.
    *   `Tab`: Switch Source/Target.
    *   `Space`: Pick Source or Toggle Link.

### Diff Prompt

*   **Keyboard:**
    *   `Left` / `Right`: Switch Action (Original / Modified / Edit).
    *   `Enter`: Submit selection.

### Dial Prompt

*   **Keyboard:**
    *   `Arrows`: Adjust value (rotate knob).
    *   `Enter`: Submit.

*   **Mouse:**
    *   `Scroll`: Adjust value.

### Draw Prompt

*   **Keyboard:**
    *   `Arrows`: Move cursor.
    *   `Space`: Toggle pixel.
    *   `c`: Clear canvas.
    *   `i`: Invert canvas.
    *   `Enter`: Submit.

*   **Mouse:**
    *   `Drag`: Paint (Left Click) or Erase (Right Click).
    *   `Click`: Toggle pixel.

### Breadcrumb Prompt
*   **Keyboard:**
    *   `Arrows`: Navigate list.
    *   `Enter`: Drill down into folder.
    *   `Backspace`: Go up one level.

*  **Mouse:**
    *   `Scroll`: Navigate list.

### Schedule Prompt
*   **Keyboard:**
    *   `Arrows`: Move task in time.
    *   `Tab` / `Shift + Tab`: Switch between tasks.
    *   `Shift + Left/Right`: Resize task duration.
    *   `PageUp` / `PageDown`: Scroll timeline horizontally.

* **Mouse:**
    *   `Scroll`: Scroll timeline horizontally.

### Data Inspector
*   **Keyboard:**
    *   `Space` / `Arrows`: Expand/Collapse nodes.
    *   `Enter`: Toggle Boolean or Edit String/Number.

*   **Mouse:**
    *   `Scroll`: Navigate tree.

### Seat Prompt
*   **Keyboard:**
    *   `Arrows`: Navigate seat grid.
    *   `Tab` / `Shift+Tab`: Navigate Left/Right.
    *   `Space`: Select/Deselect seat.

*   **Mouse:**
    *   `Scroll`: Navigate Up/Down.

### Select Range Prompt
*   **Keyboard:**
    *   `Arrows (Up/Down)`: Navigate items.
    *   `Space`: Set/Unset anchor point.
    *   `Enter`: Submit selected range.

### Sort Grid Prompt
*   **Keyboard:**
    *   `Arrows`: Navigate grid.
    *   `Tab` / `Shift+Tab`: Navigate Left/Right.
    *   `Space`: Grab/Drop item.
    *   `Enter`: Submit grid.

*   **Mouse:**
    *   `Scroll`: Navigate Up/Down.

## License

This project is under the **MIT License**.
