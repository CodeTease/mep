# Validation

Most input prompts in Mep support a `validate` function in their options. This allows you to enforce rules on user input before accepting it.

## Usage

The `validate` function receives the current value and should return:
- `true` (boolean): Validation passed.
- `string`: Validation failed; the string is displayed as the error message.

### Example: Text Validation

```typescript
const username = await MepCLI.text({
    message: 'Choose a username',
    validate: (value) => {
        if (value.length < 3) return 'Username must be at least 3 characters.';
        if (/[^a-z0-9]/.test(value)) return 'Only lowercase letters and numbers allowed.';
        return true;
    }
});
```

### Example: Number Validation

```typescript
const age = await MepCLI.number({
    message: 'Enter your age',
    validate: (value) => {
        if (value < 18) return 'You must be 18 or older.';
        return true;
    }
});
```

## Real-time Validation

Validation typically runs when the user attempts to submit (presses Enter). However, some prompts (like `RegexPrompt`) may implement real-time feedback mechanisms visually, while `validate` acts as the final gatekeeper.
