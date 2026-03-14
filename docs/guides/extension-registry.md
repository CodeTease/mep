# Extension Registry System

The **Extension Registry System** is Mep's powerful plugin mechanism that allows you to register custom prompt types and access them through the unified `MepCLI.prompt()` API. This system enables seamless integration of your own UI components while maintaining full type safety.

## Overview

The registry provides a centralized map of prompt implementations. When you call `MepCLI.prompt({ type: 'name', ... })`, Mep looks up the registered class, instantiates it, and executes its render loop.

Key benefits:
- **Unified API**: Call all prompts (built-in and custom) using the same pattern.
- **Type Safety**: Full IDE autocompletion and compile-time checks for your custom options and result types.
- **Extensibility**: Overwrite built-in prompts or add niche-specific interactions.

---

## 1. Registering a Custom Prompt

To register a custom prompt, you need to use the `MepCLI.register()` method.

```typescript
import { MepCLI } from 'mepcli';
import { MyCustomPrompt } from './prompts/MyCustomPrompt';

// Register the prompt type 'my-custom'
MepCLI.register('my-custom', MyCustomPrompt);
```

> [!NOTE]
> If you register a prompt type that already exists, `MepCLI` will issue a warning and overwrite the existing implementation.

---

## 2. Ensuring Type Safety (Declaration Merging)

To get full TypeScript support for your new prompt type, you MUST extend the `ExtensionRegistry` interface using **Declaration Merging**.

In a `.d.ts` file or at the top of your main entry file:

```typescript
import { MyCustomOptions } from './types';

declare module 'mepcli' {
  interface ExtensionRegistry {
    'my-custom': {
      options: MyCustomOptions;
      result: string; // The type returned by the prompt
    };
  }
}
```

Once merged, TypeScript will:
1. Validate that the class passed to `register` matches the options/result signature.
2. Provide autocompletion for `type: 'my-custom'` inside `MepCLI.prompt()`.
3. Infer the correct return type for the `await` expression.

---

## 3. Usage Example

Here is a full workflow of creating, registering, and using an extension.

### Step A: Implementation
First, create your prompt class (see [Custom Prompts Guide](./custom-prompts.md) for details).

```typescript
// MyPrompt.ts
import { Prompt } from 'mepcli';

export interface MyOptions { message: string; }

export class MyPrompt extends Prompt<string, MyOptions> {
    protected render() { /* logic */ }
    protected handleInput() { /* logic */ }
}
```

### Step B: Registration
Register the extension and its types.

```typescript
// registry.ts
import { MepCLI } from 'mepcli';
import { MyPrompt, MyOptions } from './MyPrompt';

declare module 'mepcli' {
  interface ExtensionRegistry {
    'greet': { options: MyOptions; result: string };
  }
}

MepCLI.register('greet', MyPrompt);
```

### Step C: Invocation
Call your prompt from anywhere in your application.

```typescript
// app.ts
import { MepCLI } from 'mepcli';
import './registry'; // Ensure registration runs

const name = await MepCLI.prompt({
    type: 'greet',
    message: 'What is your name?'
});

console.log(`Hello, ${name}!`);
```

---

## 4. Why use the Registry?

While you can always call `new MyPrompt(options).run()` directly, the Registry system is preferred because:

1. **Abstraction**: Your high-level code doesn't need to know about specific prompt classes, only their logical "types".
2. **Pipelines**: The [Pipeline API](../features/pipelines.md) can often utilize registered types for cleaner step definitions.
3. **Internal Overrides**: You can replace a built-in Mep prompt (e.g., `text`) with your own enhanced version globally without changing your application's logic.

---

## Related

- [Creating Custom Prompts](./custom-prompts.md)
- [Architecture & Render Loop](./architecture.md)
- [Pipeline System](../features/pipelines.md)
