# Rich UI Prompts

These prompts offer advanced user interface components for complex interactions.

## Kanban

The `kanban` prompt allows moving items between columns (e.g., Todo -> Doing -> Done).

```typescript
const board = await MepCLI.kanban({
    message: 'Update Status',
    columns: [
        { id: 'todo', title: 'To Do', items: [{ id: '1', title: 'Task A' }] },
        { id: 'done', title: 'Done', items: [] }
    ]
});
```

## Rating

The `rating` prompt allows users to give a score (star rating).

```typescript
const stars = await MepCLI.rating({
    message: 'Rate this library',
    min: 1,
    max: 5,
    char: '⭐'
});
```

## Slider

The `slider` prompt selects a value within a range by dragging a handle.

```typescript
const volume = await MepCLI.slider({
    message: 'Set Volume',
    min: 0,
    max: 100,
    step: 5,
    initial: 50
});
```

## Range

The `range` prompt selects a start and end value (two handles).

```typescript
const priceFilter = await MepCLI.range({
    message: 'Price Range',
    min: 0,
    max: 1000,
    unit: '$'
});
// Returns: [100, 500]
```

## Transfer

The `transfer` prompt allows moving items between two lists (Source/Target).

```typescript
const assigned = await MepCLI.transfer({
    message: 'Assign Users',
    source: ['Alice', 'Bob', 'Charlie'],
    target: ['Dave'] // Already assigned
});
```

## Form

The `form` prompt collects multiple fields in a single view. If you need to sequentially ask users for input step-by-step, see the [Pipeline API Multi-Step Sequential Form](../features/pipelines.md#multi-step-sequential-form) example.

```typescript
const user = await MepCLI.form({
    message: 'Register User',
    fields: [
        { name: 'first', message: 'First Name' },
        { name: 'last', message: 'Last Name' },
        { name: 'email', message: 'Email' }
    ]
});
```

## Map

The `map` prompt is a Key-Value editor.

```typescript
const env = await MepCLI.map({
    message: 'Environment Variables',
    initial: {
        'NODE_ENV': 'development',
        'PORT': '3000'
    }
});
```

## Seat

The `seat` prompt allows selecting seats from a visual layout (e.g., cinema, airplane).

```typescript
const seats = await MepCLI.seat({
    message: 'Choose your seats',
    rows: ['A', 'B', 'C'],
    cols: ['1', '2', '3', '4'],
    unavailable: ['A1', 'B2']
});
```

## Pattern

The `pattern` prompt implements an Android-style unlock pattern.

```typescript
const code = await MepCLI.pattern({
    message: 'Draw unlock pattern',
    rows: 3,
    cols: 3
});
```

## Dial

The `dial` prompt simulates a rotary dial for selecting values.

```typescript
const frequency = await MepCLI.dial({
    message: 'Tune Radio',
    min: 88,
    max: 108
});
```

## Draw

The `draw` prompt provides a canvas for drawing pixel art or signatures.

```typescript
const signature = await MepCLI.draw({
    message: 'Sign here',
    width: 20,
    height: 10
});
```

## Match

The `match` prompt asks users to connect items from two lists (e.g., Country -> Capital).

```typescript
const pairs = await MepCLI.match({
    message: 'Match Pairs',
    left: ['France', 'Germany'],
    right: ['Berlin', 'Paris']
});
```

## Shortcut

The `shortcut` prompt records a keyboard combination (e.g., Ctrl+S).

```typescript
const key = await MepCLI.shortcut({
    message: 'Press a shortcut to bind'
});
// Returns: { name: 's', ctrl: true, meta: false, ... }
```

## Quiz Text

The `quizText` prompt asks a text question and validates the answer.

```typescript
const answer = await MepCLI.quizText({
    message: 'What is 2 + 2?',
    correctAnswer: '4'
});
```

## Box

The `box` prompt allows editing the top, right, bottom, and left values of a box model.

```typescript
const margin = await MepCLI.box({
    message: 'Set Margins',
    initial: { top: 10, right: 20, bottom: 10, left: 20 }
});
```

## Related

- [Data Visualization](./data-visualization.md)
- [Event Handling](../features/events.md)
