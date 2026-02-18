# Spinner

The Spinner utility provides a simple way to indicate background activity to the user.

## Usage

```typescript
import { MepCLI } from 'mepcli';

const spinner = MepCLI.spinner('Loading resources...');

spinner.start();

// Simulate work
await new Promise(resolve => setTimeout(resolve, 2000));

spinner.stop('Resources loaded!');
```

## API

### `MepCLI.spinner(message: string)`
Creates a new spinner instance.

### `spinner.start()`
Starts the animation loop.

### `spinner.stop(message?: string, type?: 'success' | 'error' | 'info')`
Stops the animation and replaces the line with a final message.
