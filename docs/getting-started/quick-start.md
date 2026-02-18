# Quick Start

Here is a simple example to get you started with your first prompt.

## 1. Import MepCLI

```typescript
import { MepCLI } from 'mepcli';
```

## 2. Create a Simple Prompt

Let's ask the user for their name using the `text` prompt.

```typescript
import { MepCLI } from 'mepcli';

async function main() {
  console.log('Welcome to the CLI!');

  const name = await MepCLI.text({
    message: 'What is your name?',
    placeholder: 'e.g. Alice'
  });

  const confirm = await MepCLI.confirm({
    message: `Hello, ${name}! Is this correct?`,
    initial: true
  });

  if (confirm) {
    console.log('Great! Nice to meet you.');
  } else {
    console.log('Oops, let\'s try again.');
  }
}

main().catch(console.error);
```

## 3. Run the Code

Save the file as `index.ts` and run it using `ts-node` or compile it with `tsc`.

```bash
npx ts-node index.ts
```

## Next Steps

- [Basic Inputs](../prompts/basic-inputs.md)
- [Selection Prompts](../prompts/selection.md)
- [Pipelines](../features/pipelines.md)
