# Changelog

All notable changes to **Mep** (`mepcli`) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org/). Release dates reflect the npm publication date when a version was published, and the Git tag date otherwise.

> **Baseline: v1.0.0 (2026-02-04).** This changelog uses `v1.0.0` as its baseline. The v1.0.0 entry records the baseline itself; every entry for a later version describes changes made after that stable release. Releases before v1.0.0 are summarized in [Earlier history](#earlier-history) for context.

## [Unreleased]

### Fixed

- **Spinner and process lifecycle**
  - Ignore `EPIPE` when writing spinner frames, so a closed output pipe does not crash the prompt.
  - Let host `SIGINT` listeners finish their cleanup before the spinner exits.
- **Selection and cursors**
  - Track the `selectRange` anchor by choice identity instead of its filtered position.
  - Keep `transfer` cursors on real items after moving entries.
  - Keep the `sortGrid` cursor and swaps inside ragged rows.
  - Start a `pattern` drag on left press regardless of prior pointer motion.
  - Avoid mutating the caller's initial array in `list`.
  - Handle an empty choices list in `slot`.
  - Render `region` maps that contain no regions.
  - Handle empty `miller` data without crashing.
  - Clear the `breadcrumbSearch` overlay when drilling down.
- **Input and value handling**
  - Preserve surrogate pairs in `input`, keeping emoji and non-BMP characters intact.
  - Parse clock strings supplied as the initial `time` value.
  - Parse prefixed and partial versions in `semver`.
  - Clamp the day when changing months in `date`.
  - Clamp the day when paging months and years in `calendar`, and keep `End` within the current month.
  - Submit the exact initial value when a `byte` prompt is left untouched.
  - Preserve untouched initial expressions in `cron`.
  - Keep `0` and `false` values when editing `spreadsheet` cells, and ignore editing when there are no rows.
  - Render invalid `Date` values in `dataInspector` without throwing.
- **External tools and rendering**
  - Reject `diff` when the delegated editor is cancelled.
  - Guard `setRawMode` in `editor` on non-TTY stdin.
  - Finalize an `exec` prompt on close instead of relying on process exit.
  - Start the `spam` decay timer when the prompt runs.
  - Clone `kanban` column structure without JSON serialization.
  - Prevent duplicate editors and stdin listeners in `curl`.
  - Avoid negative padding for wide and ZWJ `emoji`.
  - Restore the console after overlapping `tasks` runners stop.

### Tests

- Added regression coverage for the fixes above across the affected prompts.

## [2.0.0-rc.2] - 2026-11-16

### Added

- Expanded the Bun test suite with prompt-specific tests for autocomplete, base prompt lifecycle, calculator, calendar, checkbox, code, form, kanban, list, match, multi-column selection, multi-range, number, OTP, regex, schedule, slider, snippet, spinner, table, theme, time, and other prompts.

### Changed

- Migrated formatting and linting to Bun's native tooling (`bun fmt`, `bun lint`) with `bunfig.toml`: four-space indentation, single quotes, and a 120-character line width. The previous Biome configuration was removed.
- Added `AGENTS.md` and updated the CI and contribution documentation for the Bun-based workflow.

### Security

- Replaced `Function` evaluation in `calculator` with a dedicated safe expression parser.

### Fixed

- **Validation and submission**
  - Await async `validate` callbacks before submitting in `text`, `list`, and `phone`.
  - Surface validator errors thrown while submitting a `form`.
  - Make `Tab` advance focus in `form` instead of moving backwards.
  - Reject malformed numeric input on submit in `number`.
  - Evaluate stateful `regex` test cases from a clean `lastIndex`.
- **Empty states and data integrity**
  - Handle empty data arrays in `table` and `schedule`.
  - Handle an empty fields array in `form`.
  - Keep committed `multiRange` ranges stable across filtering.
  - Discard a pending `autocomplete` search once the prompt settles.
  - Avoid inserting `undefined` when moving out of an empty `kanban` column.
  - Guard pick and link actions in `match` for empty lists.
  - Ignore edit keys in `snippet` and `code` when the template has no placeholders.
  - Keep the last valid country in `phone` when the country filter becomes empty.
  - Edit a copy of the data in `spreadsheet`, so cancelling leaves the input untouched.
  - Enforce the documented `calendar` min/max bounds and clone range anchors instead of sharing the cursor.
  - Apply an assigned `MepCLI.theme` to the shared theme.
  - Clear the step timeout timer in `pipeline` after the step settles.
  - Keep the `otp` cursor inside the fixed slot array.
  - Skip separators during `multiColumnSelect` navigation.
  - Escape percent signs in `curl` commands generated for CMD.
- **Rendering and formatting**
  - Honor `spinner.stop(message, type)` and terminate the prompt line.
  - Terminate the prompt line when `checkbox` submits.
  - Render the handle for a zero-length `slider` range.
  - Measure truncation width with `isWideCodePoint` in the prompt base class.
  - Wrap minute values back onto the step grid and align the minute preview in `time`.

## [2.0.0-rc.1] - 2026-09-01

### Added

- `map` masking via `mask`, which accepts either a boolean or a `(key, value) => boolean` callback.
- Multiple phone masks per country in `phone`. The prompt chooses the mask dynamically from the entered length, and strict validation accepts any valid mask length while reporting the expected lengths.

### Changed

- Cut the first 2.0 release candidate and refreshed package dependencies.

## [2.0.0-beta.4] - 2026-03-15

### Added

- Extension Registry system:
  - `MepCLI.register(type, PromptClass)` registers a custom prompt.
  - `MepCLI.prompt({ type, ...options })` runs registered prompts through one unified, type-safe API.
  - The `ExtensionRegistry` interface supports declaration merging for typed options and results.
  - Built-in prompt types can be overridden; registering a duplicate type warns before replacing the existing implementation.
  - Public exports for custom prompt authoring: `Prompt`, `PromptConstructor`, `InputParser`, `ANSI`, `stringWidth`, `truncate`, and `stripAnsi`.
- Extension Registry guide, example, and unit tests.

### Changed

- Updated the license year to 2026.

## [2.0.0-beta.3] - 2026-03-04

### Changed

- Migrated linting and formatting from ESLint to Biome.
- Build output now separates JavaScript compilation (SWC) from declaration generation (`tsc`), and the published package entry points were corrected.
- Enabled SWC minification and disabled source maps to reduce the unpacked package size.
- Updated CI and contribution documentation.

## [2.0.0-beta.2] - 2026-03-02

### Changed

- Completed the Bun migration for development and tests: `bun test` replaced Jest, `bun example.ts` replaced `ts-node`, and the Jest configuration and related dependencies were removed.
- Cleared the remaining experimental annotations from `exec` and `Pipeline`.
- Updated the README Pipeline section to match the upgraded Pipeline API.

## [2.0.0-beta.1] - 2026-03-02

### Added

- Additional license data for a wider range of licenses.

### Changed

- Moved the project toolchain to Bun and SWC: added `.swcrc`, switched CI to Bun, replaced the npm lockfile with `bun.lock`, and added a `typecheck` script.
- Refactored `SelectRangePrompt` and its base class for stricter type safety.
- Changed repository links from the `dev` branch to `main`.

### Fixed

- Corrected visual issues in the split-view `license` prompt.
- Fixed documentation typos and spacing.

## [1.4.0] - 2026-02-22

### Added

- Major `Pipeline` workflow-engine upgrade:
  - Named and anonymous steps, including merging a partial object into the context.
  - Conditional anonymous steps with `stepIf(condition, action)`.
  - Nested pipelines as step actions.
  - Per-step `transform`, `validate`, `timeout`, `fallback`, `optional`, and `onError` options.
  - Pipeline-level validation and lifecycle hooks: `onPipelineStart`, `onPipelineComplete`, `onStepStart`, `onStepComplete`, and `onError`.
  - Global cancellation through an `AbortSignal`.
  - Early exit with `PipelineExit`.
  - Typed `PipelineValidationError`, `PipelineTimeoutError`, and `PipelineAbortError` errors.
  - `TaskRunner` propagation into nested pipeline steps.
- Expanded Pipeline tests and an updated pipeline demo.

### Changed

- Reworked the Pipeline documentation around the new step types, validation, hooks, error handling, and TaskRunner integration.

## [1.3.2] - 2026-02-21

### Added

- Unit tests for `ConfirmPrompt` and `TextPrompt`.
- Multi-step sequential form example.
- Documentation for mouse support.

### Changed

- Reorganized the documentation into `getting-started/`, `features/`, `prompts/`, and `guides/` subdirectories with navigation links.
- Updated the documentation index to point at the new locations.

### Fixed

- Corrected a critical README typo.

## [1.3.1] - 2026-02-18

### Changed

- Documentation-only release: added the initial documentation set and index, covering getting started, prompt references, features, guides, testing, and contributing.
- Added a dedicated shortcuts reference under `docs/`.
- Added a documentation link to the root README.

## [1.3.0] - 2026-02-11

### Added

- Multi-shell command generation in `curl` for Bash, PowerShell, and CMD, with single-line output for CMD.
- Live output, cancellation, timeout, and detailed error reporting in `exec`, including exit code, stdout, and stderr.
- Autocomplete suggestions with ghost text in `map`; `Tab` accepts a suggestion.
- Comprehensive `exec` example.

### Changed

- Stabilized the `curl` prompt for nested prompts and removed its experimental status.
- Removed the experimental label from `exec` in the README.
- Documented the cURL shortcuts in the README.

### Fixed

- Prevented `CurlPrompt` UI artifacts when used inside nested prompts.
- Hardened cURL command escaping.

## [1.2.0] - 2026-02-06

### Changed

- Reworked the `MepCLI` API documentation with detailed types and usage examples.
- Reformatted the source, examples, and tests.
- Updated documentation URLs for the `byte`, `slot`, and `gauge` prompts and refreshed gallery media.

This release contained no intentional runtime behavior changes.

## [1.1.0] - 2026-02-05

### Added

- Syntax highlighting in `CodePrompt` for environment files, TOML, CSV, Shell, and Properties, in addition to JSON.
- Highlighter test coverage and demos for the new languages.

### Changed

- Expanded the prompt gallery with demos for calendar, code, color, cron, form, grid, heatmap, IP, kanban, map, OTP, quiz, semver, snippet, spam, time, and wait prompts.
- Moved the heatmap demo media into `media/`.

### Fixed

- Corrected a gallery typo and a linting issue in the highlighter.

## [1.0.1] - 2026-02-04

### Fixed

- Restored the cursor position on exit for multi-line prompts.

## [1.0.0] - 2026-02-04

**Baseline release.** Mep's first stable release and the reference point for this changelog.

At this baseline, Mep provided:

- 70+ prompt types covering basic input, selection and pickers, advanced layouts, specialized inputs, gamified prompts, and CLI utilities.
- The unified `MepCLI` facade for invoking prompts.
- The `Pipeline` sequential workflow engine and the `TaskRunner` for concurrent spinners and progress bars.
- Zero runtime dependencies.
- Keyboard and mouse navigation, including scrolling and click interaction.
- Theming, validation, cursor editing, and Unicode fallback for limited terminals.
- TypeScript types and CommonJS output for Node.js.

## Earlier history

Versions released before the v1.0.0 baseline are summarized here for context; they are not part of the detailed changelog above.

| Versions | Released | Summary |
| :--- | :--- | :--- |
| 0.1.0 | 2025-11-20 | First npm publication: initial `text`, `password`, `select`, `checkbox`, and `confirm` prompts with validation, cursor editing, and ANSI styling. |
| 0.2.0 – 0.2.7 | 2025-11-24 – 2025-12-27 | Early tagged releases. Added emoji support, diff rendering, the input parser, and improved return types for choice-based prompts. |
| 0.3.0 | 2026-01-12 | Added graceful Unicode degradation and a shared symbol set, including the `MEP_NO_UNICODE` override for ASCII-only terminals. |
| 0.4.0 | 2026-01-13 | Added SGR mouse tracking, the `rating` prompt, mouse scrolling for slider/date/toggle/confirm prompts, and date-prompt fixes. |
| 0.5.0 | 2026-01-24 | Added async `autocomplete`, sortable `sort`, and `table` prompts, and refactored the spinner into an instance-based architecture. |
| 0.5.5 | 2026-01-25 | Added the `editor`, `tree`, and `keypress` prompts. |
| 0.6.0 | 2026-01-30 | Major prompt expansion: calendar, grid, color, cron, transfer, range, code, tree-select, form, snippet, wait, spam, and secret prompts, plus keyboard shortcuts and broader mouse support. |
| 0.6.1 | 2026-01-31 | Added the zero-flicker rendering engine and a robust linear-scan diff engine. |
| 1.0.0-beta.1 – rc.2 | 2026-02-02 – 2026-02-04 | Stabilization series that added PhonePrompt, Pipeline, TaskRunner, and the remaining prompt set (license, dependency, regex, box, connection string, cURL, schedule, data inspector, exec, and advanced navigation prompts), and removed the Terminal and Mnemonic prompts; released v1.0.0. |

[unreleased]: https://github.com/CodeTease/mep/compare/v2.0.0-rc.2...HEAD
[2.0.0-rc.2]: https://github.com/CodeTease/mep/compare/v2.0.0-rc.1...v2.0.0-rc.2
[2.0.0-rc.1]: https://github.com/CodeTease/mep/compare/v2.0.0-beta.4...v2.0.0-rc.1
[2.0.0-beta.4]: https://github.com/CodeTease/mep/compare/v2.0.0-beta.3...v2.0.0-beta.4
[2.0.0-beta.3]: https://github.com/CodeTease/mep/compare/v2.0.0-beta.2...v2.0.0-beta.3
[2.0.0-beta.2]: https://github.com/CodeTease/mep/compare/v2.0.0-beta.1...v2.0.0-beta.2
[2.0.0-beta.1]: https://github.com/CodeTease/mep/compare/v1.4.0...v2.0.0-beta.1
[1.4.0]: https://github.com/CodeTease/mep/compare/v1.3.2...v1.4.0
[1.3.2]: https://github.com/CodeTease/mep/compare/v1.3.1...v1.3.2
[1.3.1]: https://github.com/CodeTease/mep/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/CodeTease/mep/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/CodeTease/mep/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/CodeTease/mep/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/CodeTease/mep/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/CodeTease/mep/releases/tag/v1.0.0
