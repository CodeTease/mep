# Installation

You can install `mepcli` using your preferred package manager.

## NPM

```bash
npm install mepcli
```

## Yarn

```bash
yarn add mepcli
```

## PNPM

```bash
pnpm add mepcli
```

## Bun

```bash
bun add mepcli
```

## TypeScript Setup

Mep is written in TypeScript and ships with type definitions. No additional `@types/` package is required.

Ensure your `tsconfig.json` has `esModuleInterop` enabled if you encounter import issues, although Mep supports both CommonJS and ESM.

```json
{
  "compilerOptions": {
    "esModuleInterop": true,
    "moduleResolution": "node"
  }
}
```
