# Task Runner

The Task Runner allows executing multiple concurrent or sequential tasks with real-time progress updates (spinners and progress bars).

## Usage

```typescript
import { MepCLI } from 'mepcli';

const tasks = MepCLI.tasks({
    concurrent: true, // Run tasks in parallel
    renderer: 'default'
});

tasks.add('Fetching Data', async (ctx, task) => {
    task.output = 'Connecting...';
    await new Promise(r => setTimeout(r, 1000));
    task.output = 'Downloaded 50%';
});

tasks.add('Compiling Assets', async (ctx, task) => {
    await new Promise(r => setTimeout(r, 1500));
});

await tasks.run();
```

## Context

Tasks share a context object (`ctx`) which can be used to pass data between them.

```typescript
tasks.add('Get User', async (ctx) => {
    ctx.user = await fetchUser();
});

tasks.add('Save User', async (ctx) => {
    await save(ctx.user);
});
```

## Related

- [Spinner](./spinner.md)
- [Pipelines](./pipelines.md)
