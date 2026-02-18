# Pipelines

Pipelines provide a way to chain prompts and tasks into a sequential workflow. This is useful for wizards, installers, or multi-step configurations.

## Usage

```typescript
import { MepCLI } from 'mepcli';

interface Context {
    name: string;
    age: number;
}

const result = await MepCLI.pipeline<Context>()
    .step('name', async (ctx) => {
        ctx.name = await MepCLI.text({ message: 'What is your name?' });
    })
    .step('age', async (ctx) => {
        ctx.age = await MepCLI.number({ message: 'How old are you?' });
    })
    .stepIf(
        (ctx) => ctx.age < 18,
        'parent',
        async (ctx) => {
            console.log('Parental permission required.');
        }
    )
    .run();

console.log('Final Context:', result);
```

## API

### `.step(id: string, action: (ctx: T) => Promise<void>)`
Adds a step to the pipeline.

### `.stepIf(condition: (ctx: T) => boolean, id: string, action)`
Conditionally executes a step.

### `.run(initialContext?: T)`
Executes the pipeline and returns the final context.
