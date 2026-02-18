# Selection Prompts

These prompts allow users to choose from a list of options.

## Select

The `select` prompt allows picking one option from a list.

```typescript
const framework = await MepCLI.select({
    message: 'Choose a framework',
    choices: [
        { title: 'React', value: 'react', description: 'A library for web and native user interfaces' },
        { title: 'Vue', value: 'vue', description: 'The Progressive JavaScript Framework' },
        { title: 'Svelte', value: 'svelte' }
    ],
    initial: 'react'
});
```

## MultiSelect / Checkbox

The `checkbox` (or `multiSelect`) prompt allows picking multiple options.

```typescript
const tools = await MepCLI.checkbox({
    message: 'Select tools',
    choices: [
        { title: 'ESLint', value: 'eslint', selected: true },
        { title: 'Prettier', value: 'prettier' },
        { title: 'Jest', value: 'jest' }
    ],
    min: 1, // Minimum selections required
    max: 3  // Maximum selections allowed
});
```

## Toggle

The `toggle` prompt is a binary switch, similar to `confirm` but with custom labels.

```typescript
const mode = await MepCLI.toggle({
    message: 'Select Mode',
    activeText: 'Production',
    inactiveText: 'Development',
    initial: false
});
```

## List

The `list` prompt allows entering multiple text values, separated by commas.

```typescript
const tags = await MepCLI.list({
    message: 'Enter tags (comma separated)',
    placeholder: 'api, v1, beta'
});
// Returns: ['api', 'v1', 'beta']
```

## Autocomplete

The `autocomplete` prompt filters choices as you type. It supports async suggestions.

```typescript
const country = await MepCLI.autocomplete({
    message: 'Select Country',
    suggest: async (input) => {
        const allCountries = ['USA', 'Canada', 'Mexico', 'UK', 'France'];
        return allCountries
            .filter(c => c.toLowerCase().includes(input.toLowerCase()))
            .map(c => ({ title: c, value: c }));
    }
});
```

## Fuzzy Select

The `fuzzySelect` prompt performs a fuzzy search on the provided choices list client-side.

```typescript
const pkg = await MepCLI.fuzzySelect({
    message: 'Select package',
    choices: [
        { title: 'react', value: 'react' },
        { title: 'react-dom', value: 'react-dom' },
        // ... hundreds of items
    ]
});
```

## Quiz Select

The `quizSelect` prompt is a selection prompt that validates against a correct answer.

```typescript
const answer = await MepCLI.quizSelect({
    message: 'What is the capital of France?',
    choices: [
        { title: 'London', value: 'london' },
        { title: 'Paris', value: 'paris' },
        { title: 'Berlin', value: 'berlin' }
    ],
    correctValue: 'paris'
});
```

## Tree Select

The `treeSelect` prompt allows navigating and selecting from a hierarchical structure.

```typescript
const file = await MepCLI.treeSelect({
    message: 'Select file',
    data: [
        { title: 'src', value: 'src', children: [
            { title: 'index.ts', value: 'src/index.ts' },
            { title: 'utils.ts', value: 'src/utils.ts' }
        ]},
        { title: 'package.json', value: 'package.json' }
    ]
});
```

## Multi-Column Select

The `multiColumnSelect` prompt displays choices in a grid layout.

```typescript
const item = await MepCLI.multiColumnSelect({
    message: 'Pick an item',
    choices: Array.from({ length: 20 }, (_, i) => ({ title: `Item ${i+1}`, value: i })),
    cols: 4 // Number of columns
});
```

## Fuzzy Multi-Column

Combines fuzzy search with a multi-column layout.

```typescript
const item = await MepCLI.fuzzyMultiColumn({
    message: 'Search and Pick',
    choices: largeList,
    cols: 3
});
```

## Select Range / Multi Range

The `selectRange` prompt allows selecting a continuous range of items (like Shift+Click). `multiRange` allows multiple discontinuous ranges.

```typescript
const commits = await MepCLI.selectRange({
    message: 'Select commits to squash',
    choices: commitList
});
```

## Related

- [Rich UI Prompts](./rich-ui.md)
- [Keyboard Shortcuts](../features/shortcuts.md)
