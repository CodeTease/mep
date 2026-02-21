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

## Multi-Step Sequential Form

To create a multi-step form that collects fields sequentially instead of all at once, you can use a pipeline. Here is how to sequentially ask for a user's name, email, and confirmation using the `async/await` pattern with proper error handling.

```typescript
import { MepCLI } from 'mepcli';

interface InitialContext {
    name: string;
    email: string;
    confirmed: boolean;
}

async function runRegistration() {
    try {
        const result = await MepCLI.pipeline<InitialContext>()
            .step('name', async (ctx) => {
                ctx.name = await MepCLI.text({ message: "What is your name?" });
            })
            .step('email', async (ctx) => {
                ctx.email = await MepCLI.text({ message: "What is your email address?" });
            })
            .step('confirmation', async (ctx) => {
                ctx.confirmed = await MepCLI.confirm({ 
                    message: `Please confirm your details:\nName: ${ctx.name}\nEmail: ${ctx.email}\nIs this correct?` 
                });
            })
            .run({ name: '', email: '', confirmed: false });
        
        if (result.confirmed) {
            console.log('Registration complete.');
        } else {
            console.log('Registration cancelled.');
        }
    } catch (error) {
        console.error('An error occurred during registration:', error);
    }
}

await runRegistration();
```

## Related

- [Task Runner](./task-runner.md)
- [Filesystem Prompts](../prompts/filesystem.md)
