# Pipelines

Pipelines provide a powerful, sequential workflow engine. Based on the philosophy of **Enter-and-Forget (EAF)**, **Zero-Dependency**, and **Method Chaining**, Pipelines allow you to chain actions, prompts, and tasks sequentially, accumulating their results into a Context object.

## Usage

```typescript
import { MepCLI, Pipeline, PipelineExit } from 'mepcli';
import { z } from 'zod';

interface Context {
    name: string;
    age: number;
    email?: string;
    parentalConsent?: boolean;
}

const result = await new Pipeline<Context>({
    onPipelineStart: (ctx) => console.log('Starting registration...'),
    onPipelineComplete: (ctx) => console.log('Registration finished!')
})
    // 1. Named Step - result is automatically assigned to `ctx.name`
    .step('name', async () => {
        return await MepCLI.text({ message: 'What is your name?' });
    }, {
        validate: (val) => val.length > 0 || 'Name is required'
    })
    
    // 2. Another Named Step with Transformation and Zod validation
    .step('age', async () => {
        return await MepCLI.number({ message: 'How old are you?' });
    }, {
        transform: (val) => Number(val),
        validate: z.number().min(0, "Age must be positive")
    })
    
    // 3. Conditional Step - runs only if condition is true
    .stepIf(
        (ctx) => ctx.age < 18,
        'parentalConsent',
        async () => {
            return await MepCLI.confirm({ message: 'Do you have parental consent?' });
        },
        {
            validate: (val) => val === true || 'Parental consent is required for under 18'
        }
    )

    // 4. Anonymous Step - can merge a partial object into context
    .step(async (ctx) => {
        const email = await MepCLI.text({ message: 'Email address (optional):' });
        if (email) {
            return { email }; // Merged into context
        }
    })
    .run();

console.log('Final Context:', result);
```

## Step Types

### Named Steps
Assigns the return value of the action directly to the context under the specified key.
```typescript
.step('username', async () => await MepCLI.text({ message: 'Username:' }))
```

### Anonymous Steps
Executes an action that either mutates the context directly or returns a partial context object to merge into the context.
```typescript
.step(async (ctx) => {
    ctx.timestamp = Date.now();
    return { configured: true };
})
```

### Conditional Steps
Executes a step only if a given condition is met. Available as `.stepIf(condition, name, action)` and `.stepIf(condition, action)`.
```typescript
.stepIf((ctx) => ctx.needsSetup, 'setup', async () => doSetup())
```

## Step Configuration

You can pass a configuration object to any step to enable advanced capabilities:

```typescript
.step('data', fetchRemoteData, {
    // Modify the step's result before assigning to context
    transform: (val, ctx) => val.trim().toLowerCase(),
    
    // Prevent step from taking too long
    timeout: 5000, 
    
    // Validate value (string/boolean return, or Zod/schema object)
    validate: z.string().email(),
    
    // Fallback value or function if the step throws an error
    fallback: (err, ctx) => 'default_value',
    
    // If true, errors are swallowed and the step is skipped
    optional: false,
    
    // Custom error handler
    onError: (err, ctx) => console.error('Step failed:', err)
})
```

## Nested Pipelines

You can easily nest pipelines. The nested pipeline acts as the action for the step!

```typescript
const addressPipeline = new Pipeline<AddressContext>()
    .step('street', async () => /* ... */)
    .step('city', async () => /* ... */);

new Pipeline<UserContext>()
    .step('name', async () => /* ... */)
    .step('address', addressPipeline) // addressPipeline.run() result goes to ctx.address
    .run();
```

## Validation & Zod Integration

Pipelines have first-class support for validation using generic schemas (like Zod) or custom functions.

```typescript
import { z } from 'zod';

new Pipeline({
    // Validates the entire context object when the pipeline finishes
    validate: z.object({
        name: z.string(),
        age: z.number().min(18)
    })
}).step('name', /* ... */).run();
```
Both `.parse()` and `.safeParse()` are supported out of the box.

## Early Exit

You can prematurely stop the pipeline from executing further steps by returning `PipelineExit`.

```typescript
import { PipelineExit } from 'mepcli';

pipeline.step(async (ctx) => {
    if (ctx.shouldStop) {
        return PipelineExit;
    }
});
```

## Global Hooks

The Pipeline also accepts global options during initialization to hook into its lifecycle:

```typescript
const options = {
    onPipelineStart: (ctx) => {},
    onPipelineComplete: (ctx) => {},
    onStepStart: (meta, ctx) => {},
    onStepComplete: (meta, ctx) => {},
    onError: (err, meta, ctx) => {},
    signal: abortController.signal // Support for aborting the pipeline globally
};

const pipeline = new Pipeline(options);
```

## TaskRunner Integration

The Pipeline can inject a `TaskRunner` inside all of its steps if passed directly to `.run()`:

```typescript
import { TaskRunner } from 'mepcli';

const tasks = new TaskRunner();
const pipeline = new Pipeline().step('download', async (ctx, tasksEnv) => {
    // tasksEnv is the injected TaskRunner
    tasksEnv?.add('Downloading file...', async () => { /* ... */ });
});

await pipeline.run({}, tasks);
```

## Error Handling

By default, any error thrown within a step (including timeouts and validation failures) will halt the pipeline and throw an error (`PipelineValidationError`, `PipelineTimeoutError`, etc.). You can prevent this using:
- `fallback`: Provides a default value if an error occurs.
- `optional: true`: Ignores the error and continues.
- `onError`: Allows you to attach side effects before the error bubbles up.
