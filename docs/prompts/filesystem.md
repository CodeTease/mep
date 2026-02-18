# Filesystem

Prompts for interacting with the file system, selecting paths, and navigating directories.

## File

The `file` prompt allows selecting a file from the disk.

```typescript
const configPath = await MepCLI.file({
    message: 'Select configuration file',
    basePath: './config',
    extensions: ['json', 'yaml', 'toml']
});
```

## Tree

The `tree` prompt displays a directory structure for navigation and selection.

```typescript
const selectedNode = await MepCLI.tree({
    message: 'Navigate Project Structure',
    data: [
        { title: 'src', value: 'src', children: [...] },
        { title: 'tests', value: 'tests', children: [...] }
    ]
});
```

## Miller

The `miller` prompt implements "Miller Columns" (like macOS Finder) for deep hierarchical navigation.

```typescript
const path = await MepCLI.miller({
    message: 'Browse files',
    separator: '/',
    root: process.cwd()
});
```

## Breadcrumb

The `breadcrumb` prompt allows navigation via a breadcrumb trail.

```typescript
const location = await MepCLI.breadcrumb({
    message: 'Go to folder',
    path: 'home/user/documents'
});
```

## Breadcrumb Search

Combines breadcrumb navigation with search capabilities.

```typescript
const file = await MepCLI.breadcrumbSearch({
    message: 'Find file',
    root: './src'
});
```

## Related

- [Pipelines](../features/pipelines.md)
- [Task Runner](../features/task-runner.md)
