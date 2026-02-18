# Developer Tools

These prompts assist with common development tasks like versioning, code editing, and process execution.

## SemVer

The `semver` prompt facilitates semantic version bumping (major, minor, patch).

```typescript
const nextVersion = await MepCLI.semver({
    message: 'Bump package version',
    currentVersion: '1.0.2'
});
// Returns: '1.1.0' (if user selected minor)
```

## License

The `license` prompt helps select an open-source license from a standard list.

```typescript
const license = await MepCLI.license({
    message: 'Choose a license for your project',
    defaultLicense: 'MIT'
});
```

## Exec

The `exec` prompt runs a shell command and streams the output to the terminal, useful for build scripts or long-running processes.

```typescript
await MepCLI.exec({
    message: 'Building project...',
    command: 'npm run build'
});
```

## Code

The `code` prompt provides a mini code editor with syntax highlighting for various languages.

```typescript
const config = await MepCLI.code({
    message: 'Edit configuration',
    language: 'json',
    initial: '{\n  "debug": true\n}'
});
```

## Regex

The `regex` prompt allows building and testing regular expressions interactively.

```typescript
const emailRegex = await MepCLI.regex({
    message: 'Create an email validation regex',
    tests: ['test@example.com', 'invalid-email', 'user.name@domain.co.uk']
});
```

## Dependency

The `dependency` prompt manages package dependencies, highlighting conflicts or requirements.

```typescript
const plugins = await MepCLI.dependency({
    message: 'Select plugins to install',
    choices: [
        { title: 'Core', value: 'core' },
        { title: 'Auth (Requires Core)', value: 'auth', dependsOn: ['core'] }
    ]
});
```

## Diff

The `diff` prompt displays a Git-style difference between two strings.

```typescript
const changes = await MepCLI.diff({
    message: 'Review changes before committing',
    original: oldFileContent,
    modified: newFileContent
});
```

## Snippet

The `snippet` prompt fills in variables within a code template.

```typescript
const component = await MepCLI.snippet({
    message: 'Generate Component',
    template: `export const {{name}} = () => <div>{{text}}</div>;`,
    fields: [
        { name: 'name', message: 'Component Name' },
        { name: 'text', message: 'Button Text' }
    ]
});
```

## Color

The `color` prompt is a color picker supporting Hex, RGB, and HSL formats.

```typescript
const primaryColor = await MepCLI.color({
    message: 'Pick a primary color',
    format: 'hex',
    initial: '#007bff'
});
```

## Related

- [Creating Custom Prompts](../guides/custom-prompts.md)
- [Task Runner](../features/task-runner.md)
