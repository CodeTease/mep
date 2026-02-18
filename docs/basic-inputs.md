# Basic Inputs

These prompts handle standard user input scenarios like text, numbers, and boolean confirmations.

## Text

The `text` prompt is the most common input type. It accepts a string from the user.

```typescript
const name = await MepCLI.text({
    message: 'What is your name?',
    placeholder: 'John Doe',
    initial: 'Guest',
    validate: (value) => value.length > 0 || 'Name is required!'
});
```

### Options
- `message` (string): The question to ask.
- `placeholder` (string): Text shown when input is empty (grayed out).
- `initial` (string): Default value if user presses Enter immediately.
- `validate` (function): Validation logic.

## Password

The `password` prompt masks input characters with `*`.

```typescript
const password = await MepCLI.password({
    message: 'Enter your password',
    validate: (value) => value.length >= 8 || 'Minimum 8 characters'
});
```

### Options
- Same as `Text`, but `mask` defaults to `*`.

## Secret

The `secret` prompt hides input completely (no characters shown). Useful for API keys or sensitive tokens where even the length should not be revealed.

```typescript
const apiKey = await MepCLI.secret({
    message: 'Paste your API Key'
});
```

## Confirm

The `confirm` prompt asks a Yes/No question. It returns a boolean.

```typescript
const deleteFile = await MepCLI.confirm({
    message: 'Are you sure you want to delete this file?',
    initial: false, // Default selection (false = No, true = Yes)
    activeText: 'Yes', // Custom label for true
    inactiveText: 'No' // Custom label for false
});
```

## Number

The `number` prompt accepts numeric input. It supports arrow keys to increment/decrement.

```typescript
const age = await MepCLI.number({
    message: 'How old are you?',
    min: 0,
    max: 120,
    float: false, // Set to true for decimals
    increment: 1, // Step size for arrow keys
    initial: 18
});
```

## Byte

The `byte` prompt allows users to input data sizes (e.g., "10MB", "5KB"). It returns the value in bytes.

```typescript
const limit = await MepCLI.byte({
    message: 'Set memory limit',
    initial: 1024 * 1024 * 512 // 512MB
});
// Input: "1GB" -> Returns: 1073741824
```

## Spam

The `spam` prompt acts as a simple CAPTCHA or "press to continue" mechanic requiring repeated keypresses.

```typescript
const passed = await MepCLI.spam({
    message: 'Press Space 5 times quickly!',
    threshold: 5,
    spamKey: ' '
});
```

## Wait

The `wait` prompt pauses execution for a set duration, displaying a progress bar.

```typescript
await MepCLI.wait({
    message: 'Processing...',
    seconds: 3
});
```
