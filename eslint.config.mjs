import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  {
    files: ["**/*.{js,mjs,cjs,ts}"],
    languageOptions: {
      globals: globals.node
    }
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["dist/", "coverage/", "test/", "examples/"]
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off", // Often too strict for legacy/dynamic code, keeping flexible for now
      "@typescript-eslint/ban-ts-comment": "off",
      "no-control-regex": "off", // Essential for handling ANSI codes
      "@typescript-eslint/no-unused-vars": ["error", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_"
      }],
      "@typescript-eslint/no-empty-object-type": "off"
    }
  }
];
