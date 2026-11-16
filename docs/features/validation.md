# Validation

Most input prompts in Mep support a `validate` function in their options. This allows you to enforce rules on user input before accepting it.

## Usage

The `validate` function receives the current value and should return:

- `true` (boolean): Validation passed.
- `string`: Validation failed; the string is displayed as the error message.

### Example: Text Validation

```typescript
const username = await MepCLI.text({
  message: "Choose a username",
  validate: (value) => {
    if (value.length < 3) return "Username must be at least 3 characters.";
    if (/[^a-z0-9]/.test(value))
      return "Only lowercase letters and numbers allowed.";
    return true;
  },
});
```

### Example: Number Validation

```typescript
const age = await MepCLI.number({
  message: "Enter your age",
  validate: (value) => {
    if (value < 18) return "You must be 18 or older.";
    return true;
  },
});
```

## Asynchronous Validation

Some prompts accept a validator that returns a `Promise` (for example `text`, `list`, and `phone`). Mep waits for the promise to settle before accepting the input, so an async check cannot be bypassed by pressing `Enter` early. While the promise is pending, `TextPrompt`, `PhonePrompt` and `ListPrompt` ignore keystrokes, and `TextPrompt` submits the exact value that was handed to the validator, so the submitted value is always the one the validator approved.

```typescript
const username = await MepCLI.text({
  message: "Choose a username",
  validate: async (value) => {
    const taken = await isUsernameTaken(value);
    return taken ? "That username is already taken." : true;
  },
});
```

If the promise resolves to an error string or `false`, or rejects, the prompt shows the error and stays open instead of submitting.

## Real-time Validation

Validation typically runs when the user attempts to submit (presses Enter). However, some prompts (like `RegexPrompt`) may implement real-time feedback mechanisms visually, while `validate` acts as the final gatekeeper.

## Related

- [Basic Input Prompts](../prompts/basic-inputs.md)
- [Developer Tools](../prompts/developer-tools.md)
