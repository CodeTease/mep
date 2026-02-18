# Data Visualization

These prompts are designed to display and interact with structured data, grids, and charts.

## Table

The `table` prompt displays data in columns and rows, allowing the user to select a row.

```typescript
const selectedUser = await MepCLI.table({
    message: 'Select a user',
    columns: [
        { name: 'ID', width: 5 },
        { name: 'Name', width: 20 },
        { name: 'Role', width: 10 }
    ],
    data: [
        { value: 1, row: ['1', 'Alice', 'Admin'] },
        { value: 2, row: ['2', 'Bob', 'User'] },
        { value: 3, row: ['3', 'Charlie', 'User'] }
    ]
});
```

## Spreadsheet

The `spreadsheet` prompt allows editing a grid of data, similar to Excel.

```typescript
const data = await MepCLI.spreadsheet({
    message: 'Edit CSV Data',
    columns: [
        { name: 'Product', key: 'product', editable: false },
        { name: 'Price', key: 'price', type: 'number' },
        { name: 'Stock', key: 'stock', type: 'number' }
    ],
    data: [
        { product: 'Apple', price: 1.2, stock: 100 },
        { product: 'Banana', price: 0.8, stock: 150 }
    ]
});
```

## Grid

The `grid` prompt creates a checkbox matrix (rows x columns).

```typescript
const availability = await MepCLI.grid({
    message: 'When are you available?',
    rows: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    columns: ['Morning', 'Afternoon', 'Evening']
});
// Returns a 2D boolean array
```

## Heatmap

The `heatmap` prompt is similar to `grid` but supports multiple states (colors) per cell, useful for intensity or categorical selection.

```typescript
const schedule = await MepCLI.heatmap({
    message: 'Weekly Availability',
    rows: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    columns: ['9am', '10am', '11am', '12pm'],
    legend: [
        { value: 0, char: ' ', color: (t) => t, label: 'Free' },
        { value: 1, char: '■', color: (t) => green(t), label: 'Busy' }
    ]
});
```

## Gauge

The `gauge` prompt is a visual meter, often used for games or setting a value within a safe zone.

```typescript
const result = await MepCLI.gauge({
    message: 'Adjust pressure',
    min: 0,
    max: 100,
    initial: 50,
    safeZone: { min: 40, max: 60 }
});
```

## Slot Machine

The `slot` prompt simulates a slot machine spinner, selecting a random item from choices.

```typescript
const prize = await MepCLI.slot({
    message: 'Spin to win!',
    choices: ['🍒', '🍋', '🍇', '🍉', '⭐', '7️⃣'],
    rows: 3
});
```

## Sort

The `sort` prompt allows the user to reorder a list of items.

```typescript
const priority = await MepCLI.sort({
    message: 'Prioritize tasks (Move Up/Down)',
    items: ['Fix Critical Bug', 'Write Tests', 'Refactor Code']
});
```

## Sort Grid

The `sortGrid` prompt allows reordering items in a 2D grid layout.

```typescript
const dashboard = await MepCLI.sortGrid({
    message: 'Arrange Dashboard Layout',
    data: [
        ['Chart A', 'Chart B'],
        ['Table 1', 'Log View']
    ]
});
```

## Data Inspector

The `inspector` prompt allows navigating deeply nested JSON objects.

```typescript
const response = await fetch('https://api.github.com/users/octocat');
const json = await response.json();

await MepCLI.inspector({
    message: 'Inspect API Response',
    data: json
});
```
