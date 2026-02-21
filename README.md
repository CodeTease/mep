<h1 align="center">Mep</h1>


<p align="center">
  <sub>(Mep <a href="examples/basic-prompts.ts">Basic Prompts</a>)</a></sub>
  <img src="https://raw.githubusercontent.com/CodeTease/mep/refs/heads/dev/media/basic.gif" alt="Enquirer Survey Prompt" width="750">

**Mep** is a lightweight and zero-dependency library for creating interactive command-line prompts in Node.js. It focuses on simplicity, modern design, and robust input handling.

[Try the demo](https://stackblitz.com/edit/mepcli?file=index.js)

A **CodeTease** project.

## Documentation

For comprehensive guides, API references, and advanced usage, please visit the **[Documentation](./docs/README.md)**.

## Features

- **Zero Dependency:** Keeps your project clean and fast.
- **Comprehensive:** 70+ prompt types for every need.
- **Mouse Support:** Built-in scroll and click interaction.
- **Responsive:** Fluid cursor movement and validation.
- **Elegant:** Modern ANSI color styling.

## Installation

```sh
npm install mepcli
# or
yarn add mepcli
```

## Quick Start

```typescript
import { MepCLI } from 'mepcli';

async function main() {
    // 1. Text Input
    const name = await MepCLI.text({
        message: "What's your name?",
        placeholder: "John Doe"
    });

    // 2. Select Menu
    const lang = await MepCLI.select({
        message: "Choose language:",
        choices: [
            { title: "JavaScript", value: "js" },
            { title: "TypeScript", value: "ts" }
        ]
    });

    // 3. Confirm
    const ready = await MepCLI.confirm({
        message: "Ready to deploy?"
    });

    console.log({ name, lang, ready });
}

main();
```

> 💡 **Want more?** Check out the full feature demo in [`example.ts`](example.ts) or browse the `examples/` directory. Or see [`GALLERY.md`](GALLERY.md) for media demos.

## Prompt Types 

### 🔹 The Basics
Essential prompts for everyday input.

| Function | Description |
| :--- | :--- |
| `text` | Single line or multiline text input. |
| `password` | Masked text input (`***`). |
| `secret` | Completely hidden text input. |
| `number` | Numeric input with increment/decrement. |
| `confirm` | Yes/No question. |
| `toggle` | On/Off switch (True/False). |
| `select` | Single item selection from a list. |
| `list` | Enter a list of tags/strings. |

### 🔹 Selection & Pickers
Powerful tools for selecting dates, files, colors, and more.

| Function | Description |
| :--- | :--- |
| `checkbox` | Multiple choice selection. |
| `multiSelect` | Multiple selection with filtering. |
| `multiColumnSelect` | Selection with grid layout. |
| `fuzzyMultiColumn` | Grid layout + Fuzzy search combination. |
| `fuzzySelect` | Selection with fuzzy search. |
| `autocomplete` | Async searchable selection. |
| `selectRange` | Select a continuous range (start-end). |
| `multiRange` | Select multiple discontinuous ranges. |
| `treeSelect` | Hierarchical multi-selection. |
| `grid` | 2D matrix selection (rows x columns). |
| `seat` | Seat selection map with gaps. |
| `emoji` | Emoji picker with history. |
| `color` | RGB/Hex color picker. |
| `date` | Date and time picker. |
| `calendar` | Interactive calendar for dates/ranges. |
| `time` | Time picker. |
| `file` | File system navigator. |
| `breadcrumb` | Breadcrumb navigation style. |
| `breadcrumbSearch` | Breadcrumb navigation with local fuzzy search. |
| `miller` | Miller columns navigation. |
| `tree` | Hierarchical tree navigation. |

### 🔹 Advanced Layouts
Complex interfaces for structured data.

| Function | Description |
| :--- | :--- |
| `table` | Display data in columns and select rows. |
| `spreadsheet` | Interactive table editor. |
| `inspector` | JSON data explorer/editor. |
| `schedule` | Gantt chart timeline. |
| `kanban` | Kanban board (Drag & Drop). |
| `heatmap` | Grid intensity selector. |
| `sort` | Reorder a list of items. |
| `sortGrid` | Rearrange items in a 2D grid. |
| `transfer` | Move items between two lists. |
| `match` | Link items between source and target. |
| `map` | Key-Value editor. |
| `form` | Multi-field input form. |
| `snippet` | Template string filling. |
| `cron` | Cron schedule builder. |
| `code` | Code/JSON editor with syntax highlighting. |

### 🔹 Specialized Inputs
 tailored for specific data formats.

| Function | Description |
| :--- | :--- |
| `ip` | IPv4 address input. |
| `semver` | Semantic versioning bumper. |
| `otp` | One Time Password (PIN) input. |
| `byte` | Byte size input (KB, MB, GB). |
| `rating` | Star rating input. |
| `slider` | Visual numeric slider. |
| `range` | Dual-handle slider (min-max). |
| `dial` | Rotary knob for numeric input. |
| `calculator` | Math expression evaluator. |
| `region` | ASCII map region selector. |
| `pattern` | Android-style pattern lock. |
| `dependency` | Checkbox with logic (Depends/Conflict). |
| `license` | License picker with Split View. |
| `regex` | Real-time regex validator. |
| `box` | Box model (CSS Margin/Padding) editor. |
| `phone` | International phone input with masking & country search. |
| `connectionString` | Database URL wizard. |
| `curl` | Interactive HTTP request builder. |

### 🔹 Gamified & Fun
Add some personality to your CLI.

| Function | Description |
| :--- | :--- |
| `slot` | Slot machine randomizer. |
| `gauge` | Rhythm/accuracy game. |
| `draw` | Braille canvas drawing. |
| `quizSelect` | Multiple choice quiz. |
| `quizText` | Text answer quiz. |
| `spam` | Mash keys to confirm (fun mode). |

### 🔹 Utilities
Helper functions for better CLI UX.

| Function | Description |
| :--- | :--- |
| `exec` | Run shell command with spinner. |
| `scroll` | Scrollable text viewer (e.g., License). |
| `diff` | Text merge conflict resolver. |
| `editor` | Open external editor (Vim/Nano). |
| `shortcut` | Record key combinations. |
| `keypress` | Wait for a specific key press. |
| `wait` | Pause for a few seconds. |
| `spinner` | Simple loading spinner control. |

## Task Runner (Parallel Execution)

The **Task Runner** allows you to manage multiple concurrent tasks (Spinners & Progress Bars) with a flicker-free rendering engine. It supports real-time updates and is completely zero-dependency.

```typescript
const tasks = MepCLI.tasks();

// 1. Define Tasks
tasks.add('install', { title: 'Installing dependencies', type: 'spinner' });
tasks.add('download', { title: 'Downloading core', type: 'progress', total: 100 });

// 2. Start Loop
tasks.run();

// 3. Update Tasks
tasks.start('install');
tasks.start('download', 'Connecting...');

// ...Async operations...
tasks.update('download', { current: 50, message: '50/100 MB' });

// 4. Complete
tasks.success('install', 'Done!');
tasks.success('download', 'Downloaded');
tasks.stop();
```

## Pipeline (Workflow Engine) <sub style="color:orange">(Experimental)</sub>

The **Pipeline** API allows you to orchestrate a sequence of prompts that share a common context. It follows the **Enter-and-Forget** philosophy (exceptions stop the flow) and uses a fluent Builder pattern.

```typescript
const result = await MepCLI.pipeline()
    .step('name', () => MepCLI.text({ message: 'Name:' }))
    .stepIf(
        (ctx) => ctx.name === 'admin', 
        'role', 
        () => MepCLI.select({ 
            message: 'Role:', 
            choices: ['SuperUser', 'Maintainer'] 
        })
    )
    .run();
```

## Keyboard & Mouse Support

For a detailed list of shortcuts and mouse interactions, please refer to the **[Shortcuts Documentation](./docs/features/shortcuts.md)**.

## License

This project is under the **MIT License**.
