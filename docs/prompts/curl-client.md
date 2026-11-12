# Curl Client

The `curl` prompt is a specialized tool for building and testing HTTP requests directly from the terminal. It mimics the behavior of Postman or Insomnia but in a CLI environment.

## Features

- **Method Selection**: GET, POST, PUT, DELETE, PATCH, etc.
- **URL Editor**: Edit the full URL.
- **Header Management**: Add key-value headers.
- **Body Editor**: Edit JSON or text payloads.
- **Code Generation**: Generates the equivalent `curl` command string.

## Usage

```typescript
const result = await MepCLI.curl({
  message: "Configure Webhook",
  initialMethod: "POST",
  initialUrl: "https://hooks.slack.com/services/...",
  initialHeaders: {
    "Content-Type": "application/json",
  },
  initialBody: '{"text": "Hello World"}',
});

console.log("Generated Command:", result.command);
// curl -X POST https://... -H "Content-Type: application/json" -d '{"text": "Hello World"}'
```

## Shell Escaping

The generated command is quoted for the selected shell (`bash`, `powershell`, or `cmd`, cycled with `s`). For `cmd`,
percent signs are doubled, so values such as `%PATH%` or URL-encoded bodies like `{"q":"100%25 off"}` are not expanded
by `cmd.exe` when the command is run from a `.bat` or `.cmd` file.

## Related

- [Network & Cloud Prompts](./network-cloud.md)
- [Developer Tools](./developer-tools.md)
