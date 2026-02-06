import {
    TextOptions, SelectOptions, ConfirmOptions, CheckboxOptions, ThemeConfig, NumberOptions, ToggleOptions, ListOptions, SliderOptions,
    DateOptions, FileOptions, MultiSelectOptions, RatingOptions, AutocompleteOptions, SortOptions, TableOptions, EditorOptions, TreeOptions,
    KeypressOptions, FormOptions, SnippetOptions, SpamOptions, WaitOptions, CodeOptions, TreeSelectOptions, RangeOptions, TransferOptions, CronOptions,
    ColorOptions, GridOptions, CalendarOptions, MapOptions, SemVerOptions, IPOptions, OTPOptions, QuizSelectOptions, QuizTextOptions,
    KanbanOptions, KanbanItem, TimeOptions, HeatmapOptions, ByteOptions, PatternOptions, RegionOptions, SpreadsheetOptions, SelectRangeOptions, SortGridOptions
} from './types';
import { SlotOptions, GaugeOptions, CalculatorOptions, EmojiOptions, MatchOptions, DiffOptions, DialOptions, DrawOptions, MultiColumnSelectOptions, FuzzySelectOptions, MillerOptions, ScrollOptions, BreadcrumbOptions, ScheduleOptions, ScheduleTask, DataInspectorOptions, ExecOptions, ShortcutOptions, ShortcutResult, SeatOptions, DependencyOptions, LicenseOptions, RegexOptions, BoxOptions, PhoneOptions } from './types';
import { theme } from './theme';
import { Spinner } from './spinner';
import { TextPrompt } from './prompts/text';
import { SelectPrompt } from './prompts/select';
import { CheckboxPrompt } from './prompts/checkbox';
import { ConfirmPrompt } from './prompts/confirm';
import { TogglePrompt } from './prompts/toggle';
import { NumberPrompt } from './prompts/number';
import { ListPrompt } from './prompts/list';
import { SliderPrompt } from './prompts/slider';
import { RangePrompt } from './prompts/range';
import { TransferPrompt } from './prompts/transfer';
import { CronPrompt } from './prompts/cron';
import { DatePrompt } from './prompts/date';
import { FilePrompt } from './prompts/file';
import { MultiSelectPrompt } from './prompts/multi-select';
import { RatingPrompt } from './prompts/rating';
import { AutocompletePrompt } from './prompts/autocomplete';
import { SortPrompt } from './prompts/sort';
import { TablePrompt } from './prompts/table';
import { EditorPrompt } from './prompts/editor';
import { TreePrompt } from './prompts/tree';
import { KeypressPrompt } from './prompts/keypress';
import { FormPrompt } from './prompts/form';
import { SnippetPrompt } from './prompts/snippet';
import { SpamPrompt } from './prompts/spam';
import { WaitPrompt } from './prompts/wait';
import { CodePrompt } from './prompts/code';
import { TreeSelectPrompt } from './prompts/tree-select';
import { ColorPrompt } from './prompts/color';
import { GridPrompt } from './prompts/grid';
import { CalendarPrompt } from './prompts/calendar';
import { MapPrompt } from './prompts/map';
import { SemVerPrompt } from './prompts/semver';
import { IPPrompt } from './prompts/ip';
import { OTPPrompt } from './prompts/otp';
import { QuizSelectPrompt } from './prompts/quiz-select';
import { QuizTextPrompt } from './prompts/quiz-text';
import { KanbanPrompt } from './prompts/kanban';
import { TimePrompt } from './prompts/time';
import { HeatmapPrompt } from './prompts/heatmap';
import { BytePrompt } from './prompts/byte';
import { SlotPrompt } from './prompts/slot';
import { GaugePrompt } from './prompts/gauge';
import { CalculatorPrompt } from './prompts/calculator';
import { EmojiPrompt } from './prompts/emoji';
import { MatchPrompt } from './prompts/match';
import { DiffPrompt } from './prompts/diff';
import { DialPrompt } from './prompts/dial';
import { DrawPrompt } from './prompts/draw';
import { MultiColumnSelectPrompt } from './prompts/multi-column-select';
import { FuzzySelectPrompt } from './prompts/fuzzy';
import { MillerPrompt } from './prompts/miller';
import { PatternPrompt } from './prompts/pattern';
import { RegionPrompt } from './prompts/region';
import { SpreadsheetPrompt } from './prompts/spreadsheet';
import { ScrollPrompt } from './prompts/scroll';
import { BreadcrumbPrompt } from './prompts/breadcrumb';
import { SchedulePrompt } from './prompts/schedule';
import { DataInspectorPrompt } from './prompts/data-inspector';
import { ExecPrompt } from './prompts/exec';
import { ShortcutPrompt } from './prompts/shortcut';
import { SeatPrompt } from './prompts/seat';
import { SelectRangePrompt } from './prompts/select-range';
import { SortGridPrompt } from './prompts/sort-grid';
import { DependencyPrompt } from './prompts/dependency';
import { LicensePrompt } from './prompts/license';
import { RegexPrompt } from './prompts/regex';
import { BoxPrompt } from './prompts/box';
import { PhonePrompt } from './prompts/phone';
import { FuzzyMultiColumnPrompt } from './prompts/fuzzy-multi-column';
import { MultiRangePrompt } from './prompts/multi-range';
import { BreadcrumbSearchPrompt } from './prompts/breadcrumb-search';
import { connectionString, ConnectionStringOptions, ConnectionStringResult } from './prompts/connection-string';
import { CurlPrompt, CurlOptions, CurlResult } from './prompts/curl';
import { Pipeline } from './pipeline';
import { TaskRunner } from './tasks';
import { TaskGroupOptions } from './types';

/**
 * Public Facade for MepCLI
 */
export class MepCLI {
    public static theme: ThemeConfig = theme;

    /**
     * Creates a new Spinner instance to indicate background activity.
     * @example
     * const spinner = MepCLI.spinner('Loading data...');
     * spinner.start();
     * await someAsyncOperation();
     * spinner.stop('Done!');
     * @param message - The initial text to display next to the spinner.
     * @returns A Spinner instance to control the animation.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/spinner.ts}
     */
    static spinner(message: string): Spinner {
        return new Spinner(message);
    }

    /**
     * Creates a new TaskRunner for managing multiple concurrent tasks (spinners/progress bars).
     * @example
     * const tasks = MepCLI.tasks({ concurrency: 2 });
     * tasks.add('Task 1', async () => { ... });
     * tasks.add('Task 2', async () => { ... });
     * await tasks.run();
     * @param options - Configuration for concurrency and renderer style.
     * @returns A TaskRunner instance.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/task-runner.ts}
     */
    static tasks(options?: TaskGroupOptions): TaskRunner {
        return new TaskRunner(options);
    }

    /**
     * Creates a new Pipeline instance for sequential workflow execution.
     * @experimental
     * @example
     * const context = await MepCLI.pipeline()
     *   .step('ask-name', async (ctx) => {
     *      ctx.name = await MepCLI.text({ message: 'Name?' });
     *   })
     *   .run();
     * @returns A fluent Pipeline builder.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/pipeline-demo.ts}
     */
    static pipeline<Ctx extends Record<string, any> = Record<string, any>>(): Pipeline<Ctx> {
        return new Pipeline<Ctx>();
    }

    /**
     * Standard text input prompt.
     * @example
     * const name = await MepCLI.text({
     *   message: 'What is your GitHub username?',
     *   placeholder: 'e.g., octocat',
     *   validate: (val) => val.length > 0 ? true : 'Username is required!'
     * });
     * @param options - Configuration options including validation and placeholder.
     * @returns A promise resolving to the user's input string.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/basic-prompts.ts}
     */
    static text(options: TextOptions): Promise<string> {
        return new TextPrompt(options).run();
    }

    /**
     * Single selection prompt from a list of choices.
     * @example
     * const framework = await MepCLI.select({
     *   message: 'Pick a framework',
     *   choices: [
     *     { title: 'React', value: 'react', description: 'Meta' },
     *     { title: 'Vue', value: 'vue', description: 'Community' },
     *   ]
     * });
     * @param options - Choices and configuration.
     * @returns A promise resolving to the selected value (V).
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/selection-prompts.ts}
     */
    static select<const V>(options: SelectOptions<V>): Promise<V> {
        return new SelectPrompt(options).run();
    }

    /**
     * Multiple selection prompt with checkboxes.
     * @example
     * const toppings = await MepCLI.checkbox({
     *   message: 'Select toppings',
     *   choices: [
     *     { title: 'Cheese', value: 'cheese', selected: true },
     *     { title: 'Pepperoni', value: 'pepperoni' },
     *   ],
     *   min: 1
     * });
     * @param options - Choices, limits (min/max), and initial state.
     * @returns A promise resolving to an array of selected values (V[]).
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/selection-prompts.ts}
     */
    static checkbox<const V>(options: CheckboxOptions<V>): Promise<V[]> {
        return new CheckboxPrompt(options).run();
    }

    /**
     * Boolean confirmation prompt (Y/n).
     * @example
     * const proceed = await MepCLI.confirm({
     *   message: 'Delete production database?',
     *   initial: false
     * });
     * @param options - Message and initial boolean state.
     * @returns A promise resolving to true or false.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/basic-prompts.ts}
     */
    static confirm(options: ConfirmOptions): Promise<boolean> {
        return new ConfirmPrompt(options).run();
    }

    /**
     * Secure password input (masked with *).
     * @example
     * const password = await MepCLI.password({
     *   message: 'Enter password',
     *   validate: (val) => val.length >= 8 || 'Must be 8+ chars'
     * });
     * @param options - Same as TextOptions but defaults to hidden input.
     * @returns A promise resolving to the password string.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/basic-prompts.ts}
     */
    static password(options: TextOptions): Promise<string> {
        return new TextPrompt({ ...options, isPassword: true }).run();
    }

    /**
     * Secret input prompt (no visual feedback).
     * @example
     * const apiKey = await MepCLI.secret({
     *   message: 'Paste API Key (hidden)'
     * });
     * @param options - Same as TextOptions, visual output is suppressed.
     * @returns A promise resolving to the secret string.
     * @see {@link https://github.com/CodeTease/mep/blob/main/example.ts}
     */
    static secret(options: TextOptions): Promise<string> {
        return new TextPrompt({ ...options, mask: '' }).run();
    }

    /**
     * Numeric input prompt with increments.
     * @example
     * const age = await MepCLI.number({
     *   message: 'How old are you?',
     *   min: 18,
     *   max: 99,
     *   initial: 25
     * });
     * @param options - Min, max, step, and initial value.
     * @returns A promise resolving to the entered number.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/basic-prompts.ts}
     */
    static number(options: NumberOptions): Promise<number> {
        return new NumberPrompt(options).run();
    }

    /**
     * Binary toggle switch.
     * @example
     * const isDarkMode = await MepCLI.toggle({
     *   message: 'Enable Dark Mode?',
     *   activeText: 'On',
     *   inactiveText: 'Off',
     *   initial: true
     * });
     * @param options - Text labels for states and initial value.
     * @returns A promise resolving to the boolean state.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/basic-prompts.ts}
     */
    static toggle(options: ToggleOptions): Promise<boolean> {
        return new TogglePrompt(options).run();
    }

    /**
     * Tag list input (comma separated or enter to add).
     * @example
     * const tags = await MepCLI.list({
     *   message: 'Enter keywords (comma separated)',
     *   initial: ['js', 'ts'],
     *   placeholder: 'react, vue, svelte'
     * });
     * @param options - Placeholder and initial list.
     * @returns A promise resolving to an array of strings.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/form-prompts.ts}
     */
    static list(options: ListOptions): Promise<string[]> {
        return new ListPrompt(options).run();
    }

    /**
     * Slider input for selecting a number within a range.
     * @example
     * const volume = await MepCLI.slider({
     *   message: 'Set volume',
     *   min: 0,
     *   max: 100,
     *   step: 5,
     *   initial: 50
     * });
     * @param options - Min/max range, step, and unit label.
     * @returns A promise resolving to the selected number.
     * @see {@link https://github.com/CodeTease/mep/blob/main/example.ts}
     */
    static slider(options: SliderOptions): Promise<number> {
        return new SliderPrompt(options).run();
    }

    /**
     * Dual-handle slider for selecting a numeric range.
     * @example
     * const priceRange = await MepCLI.range({
     *   message: 'Filter by price',
     *   min: 0,
     *   max: 1000,
     *   initial: [100, 500]
     * });
     * @param options - Range bounds and initial start/end values.
     * @returns A promise resolving to a tuple `[start, end]`.
     * @see {@link https://github.com/CodeTease/mep/blob/main/example.ts}
     */
    static range(options: RangeOptions): Promise<[number, number]> {
        return new RangePrompt(options).run();
    }

    /**
     * Transfer list for moving items between two lists.
     * @example
     * const [left, right] = await MepCLI.transfer({
     *   message: 'Assign users to team',
     *   source: ['Alice', 'Bob', 'Charlie'],
     *   target: ['Dave']
     * });
     * @param options - Source and target lists.
     * @returns A promise resolving to `[sourceItems, targetItems]`.
     * @see {@link https://github.com/CodeTease/mep/blob/main/example.ts}
     */
    static transfer<const V>(options: TransferOptions<V>): Promise<[V[], V[]]> {
        return new TransferPrompt(options).run();
    }

    /**
     * Cron expression generator/validator.
     * @example
     * const schedule = await MepCLI.cron({
     *   message: 'Schedule backup',
     *   initial: '0 0 * * *'
     * });
     * @param options - Initial cron string and placeholder.
     * @returns A promise resolving to the valid cron string.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/cron-prompt.ts}
     */
    static cron(options: CronOptions): Promise<string> {
        return new CronPrompt(options).run();
    }

    /**
     * Interactive date picker.
     * @example
     * const birthday = await MepCLI.date({
     *   message: 'When is your birthday?',
     *   min: new Date(1900, 0, 1),
     *   max: new Date()
     * });
     * @param options - Min/max dates and localization.
     * @returns A promise resolving to the selected Date object.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/calendar-prompt.ts}
     */
    static date(options: DateOptions): Promise<Date> {
        return new DatePrompt(options).run();
    }

    /**
     * File system explorer.
     * @example
     * const configPath = await MepCLI.file({
     *   message: 'Select config file',
     *   basePath: './src',
     *   extensions: ['json', 'yaml'],
     * });
     * @param options - Root path, allowed extensions, and directory filtering.
     * @returns A promise resolving to the absolute path of the selected file.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/filesystem-prompts.ts}
     */
    static file(options: FileOptions): Promise<string> {
        return new FilePrompt(options).run();
    }

    /**
     * Multi-select checkbox with search support (alias for checkbox logic).
     * @example
     * const features = await MepCLI.multiSelect({
     *   message: 'Select features',
     *   choices: [
     *      { title: 'TypeScript', value: 'ts' },
     *      { title: 'ESLint', value: 'lint' }
     *   ]
     * });
     * @param options - Same as CheckboxOptions.
     * @returns A promise resolving to an array of selected values.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/selection-prompts.ts}
     */
    static multiSelect<const V>(options: MultiSelectOptions<V>): Promise<V[]> {
        return new MultiSelectPrompt(options).run();
    }

    /**
     * Star rating input.
     * @example
     * const stars = await MepCLI.rating({
     *   message: 'Rate this library',
     *   min: 1,
     *   max: 5,
     *   initial: 5
     * });
     * @param options - Min/max stars.
     * @returns A promise resolving to the numeric rating.
     * @see {@link https://github.com/CodeTease/mep/blob/main/example.ts}
     */
    static rating(options: RatingOptions): Promise<number> {
        return new RatingPrompt(options).run();
    }

    /**
     * Autocomplete search with async data fetching.
     * @example
     * const city = await MepCLI.autocomplete({
     *   message: 'Search city',
     *   suggest: async (input) => {
     *     const results = await fetchCities(input);
     *     return results.map(c => ({ title: c.name, value: c.id }));
     *   }
     * });
     * @param options - `suggest` callback to filter/fetch choices.
     * @returns A promise resolving to the selected value.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/selection-prompts.ts}
     */
    static autocomplete<const V>(options: AutocompleteOptions<V>): Promise<V> {
        return new AutocompletePrompt(options).run();
    }

    /**
     * List sorting prompt.
     * @example
     * const priority = await MepCLI.sort({
     *   message: 'Prioritize tasks',
     *   items: ['Fix bugs', 'Add features', 'Write docs']
     * });
     * @param options - Array of strings to be reordered.
     * @returns A promise resolving to the reordered array of strings.
     * @see {@link https://github.com/CodeTease/mep/blob/main/example.ts}
     */
    static sort(options: SortOptions): Promise<string[]> {
        return new SortPrompt(options).run();
    }

    /**
     * Interactive data table with row selection.
     * @example
     * const selectedRow = await MepCLI.table({
     *   message: 'Pick a user',
     *   columns: ['Name', 'Role'],
     *   data: [
     *     { value: 1, row: ['Alice', 'Admin'] },
     *     { value: 2, row: ['Bob', 'User'] }
     *   ]
     * });
     * @param options - Columns definition and row data.
     * @returns A promise resolving to the `value` of the selected row.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/data-visualization.ts}
     */
    static table<const V>(options: TableOptions<V>): Promise<V> {
        return new TablePrompt(options).run();
    }

    /**
     * Open external editor (vim/nano/code) for long input.
     * @example
     * const bio = await MepCLI.editor({
     *   message: 'Write your biography',
     *   extension: 'md'
     * });
     * @param options - File extension for syntax highlighting.
     * @returns A promise resolving to the saved content.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/form-prompts.ts}
     */
    static editor(options: EditorOptions): Promise<string> {
        return new EditorPrompt(options).run();
    }

    /**
     * Hierarchical tree selection.
     * @example
     * const node = await MepCLI.tree({
     *   message: 'Select component',
     *   data: [
     *     { title: 'src', value: 'src', children: [
     *       { title: 'index.ts', value: 'src/index.ts' }
     *     ]}
     *   ]
     * });
     * @param options - Tree structure data.
     * @returns A promise resolving to the selected node's value.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/tree-prompt.ts}
     */
    static tree<const V>(options: TreeOptions<V>): Promise<V> {
        return new TreePrompt(options).run();
    }

    /**
     * Detect single keypress event.
     * @example
     * const key = await MepCLI.keypress({
     *   message: 'Press any key to continue...'
     * });
     * @param options - Optional allowed keys filter.
     * @returns A promise resolving to the pressed key name.
     * @see {@link https://github.com/CodeTease/mep/blob/main/example.ts}
     */
    static keypress(options: KeypressOptions): Promise<string> {
        return new KeypressPrompt(options).run();
    }

    /**
     * Multi-field form input.
     * @example
     * const user = await MepCLI.form({
     *   message: 'User Registration',
     *   fields: [
     *     { name: 'first', message: 'First Name' },
     *     { name: 'last', message: 'Last Name' },
     *     { name: 'email', message: 'Email', validate: (v) => v.includes('@') }
     *   ]
     * });
     * @param options - Array of field definitions.
     * @returns A promise resolving to an object with field names as keys.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/form-prompts.ts}
     */
    static form(options: FormOptions): Promise<Record<string, string>> {
        return new FormPrompt(options).run();
    }

    /**
     * Templated snippet generator.
     * @example
     * const component = await MepCLI.snippet({
     *   message: 'Create Component',
     *   template: `export function {{name}}() {
     *   return <div>{{content}}</div>;
     * }`,
     *   fields: {
     *     name: { message: 'Component Name' },
     *     content: { message: 'Content' }
     *   }
     * });
     * @param options - Template string with {{variables}} and field config.
     * @returns A promise resolving to the compiled string.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/snippet-prompt.ts}
     */
    static snippet(options: SnippetOptions): Promise<string> {
        return new SnippetPrompt(options).run();
    }

    /**
     * Anti-spam / Bot detection prompt.
     * @example
     * const isHuman = await MepCLI.spam({
     *   message: 'Press Space 5 times quickly!',
     *   threshold: 5,
     *   spamKey: ' '
     * });
     * @param options - Threshold frequency and key to mash.
     * @returns A promise resolving to true (pass) or false (fail).
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/spam-prompt.ts}
     */
    static spam(options: SpamOptions): Promise<boolean> {
        return new SpamPrompt(options).run();
    }

    /**
     * Pause execution for a set time (with progress).
     * @example
     * await MepCLI.wait({
     *   message: 'Processing...',
     *   seconds: 3
     * });
     * @param options - Duration in seconds.
     * @returns A promise resolving after the delay.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/wait-prompt.ts}
     */
    static wait(options: WaitOptions): Promise<void> {
        return new WaitPrompt(options).run();
    }

    /**
     * Source code editor with syntax highlighting.
     * @example
     * const json = await MepCLI.code({
     *   message: 'Edit Configuration',
     *   language: 'json',
     *   template: '{\n  "name": "project"\n}'
     * });
     * @param options - Language, initial template, and syntax highlighting.
     * @returns A promise resolving to the edited code string.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/code-prompt.ts}
     */
    static code(options: CodeOptions): Promise<string> {
        return new CodePrompt(options).run();
    }

    /**
     * Tree Select Prompt (Multi-selection).
     * @example
     * const selectedPaths = await MepCLI.treeSelect({
     *   message: 'Select files to include',
     *   data: [
     *     { title: 'src', value: 'src', children: [
     *         { title: 'core.ts', value: 'src/core.ts' }
     *     ]}
     *   ]
     * });
     * @param options - Tree structure and initial selections.
     * @returns A promise that resolves to an array of selected values.
     * @see {@link https://github.com/CodeTease/mep/blob/main/example.ts}
     *
     * @notice Windows Compatibility:
     * When used in a long sequence of prompts, this component may experience
     * an input delay. If it feels "blocked", simply press 'Enter' once
     * to refresh the TTY stream.
     */
    static treeSelect<const V>(options: TreeSelectOptions<V>): Promise<V[]> {
        return new TreeSelectPrompt(options).run();
    }

    /**
     * Color picker (Hex, RGB, HSL).
     * @example
     * const color = await MepCLI.color({
     *   message: 'Pick a theme color',
     *   format: 'hex',
     *   initial: '#3B82F6'
     * });
     * @param options - Format preference and initial value.
     * @returns A promise resolving to the color string.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/color-prompt.ts}
     */
    static color(options: ColorOptions): Promise<string> {
        return new ColorPrompt(options).run();
    }

    /**
     * 2D Grid Checkbox (Boolean Matrix).
     * @example
     * const availability = await MepCLI.grid({
     *   message: 'Select availability',
     *   rows: ['Mon', 'Tue'],
     *   columns: ['AM', 'PM']
     * });
     * @param options - Row/Column labels.
     * @returns A promise resolving to a 2D boolean array.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/grid-prompt.ts}
     */
    static grid(options: GridOptions): Promise<boolean[][]> {
        return new GridPrompt(options).run();
    }

    /**
     * Calendar picker for dates or ranges.
     * @example
     * const range = await MepCLI.calendar({
     *   message: 'Select vacation dates',
     *   mode: 'range'
     * });
     * @param options - Selection mode (single/range) and bounds.
     * @returns A promise resolving to a Date or [Date, Date].
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/calendar-prompt.ts}
     */
    static calendar(options: CalendarOptions): Promise<Date | [Date, Date]> {
        return new CalendarPrompt(options).run() as Promise<Date | [Date, Date]>;
    }

    /**
     * Key-Value Map editor.
     * @example
     * const envVars = await MepCLI.map({
     *   message: 'Environment Variables',
     *   initial: { NODE_ENV: 'development', PORT: '3000' }
     * });
     * @param options - Initial key-value pairs.
     * @returns A promise resolving to a record of strings.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/map-prompt.ts}
     */
    static map(options: MapOptions): Promise<Record<string, string>> {
        return new MapPrompt(options).run();
    }

    /**
     * Semantic Versioning incrementer.
     * @example
     * const nextVersion = await MepCLI.semver({
     *   message: 'Bump version',
     *   currentVersion: '1.0.0'
     * });
     * @param options - The current version string.
     * @returns A promise resolving to the new version string.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/semver-prompt.ts}
     */
    static semver(options: SemVerOptions): Promise<string> {
        return new SemVerPrompt(options).run();
    }

    /**
     * IP Address input validator.
     * @example
     * const ip = await MepCLI.ip({
     *   message: 'Enter Server IP',
     *   initial: '127.0.0.1'
     * });
     * @param options - Initial value.
     * @returns A promise resolving to the valid IP string.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/ip-prompt.ts}
     */
    static ip(options: IPOptions): Promise<string> {
        return new IPPrompt(options).run();
    }

    /**
     * One-Time Password / Pin Code input.
     * @example
     * const otp = await MepCLI.otp({
     *   message: 'Enter 2FA Code',
     *   length: 6
     * });
     * @param options - Length and masking options.
     * @returns A promise resolving to the entered code.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/otp-prompt.ts}
     */
    static otp(options: OTPOptions): Promise<string> {
        return new OTPPrompt(options).run();
    }

    /**
     * Multiple choice quiz.
     * @example
     * const answer = await MepCLI.quizSelect({
     *   message: 'What is 2 + 2?',
     *   choices: [
     *     { title: '3', value: 3 },
     *     { title: '4', value: 4 }
     *   ],
     *   correctValue: 4
     * });
     * @param options - Choices and correct answer logic.
     * @returns A promise resolving to the selected value.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/quiz-select-prompt.ts}
     */
    static quizSelect<const V>(options: QuizSelectOptions<V>): Promise<V> {
        return new QuizSelectPrompt(options).run();
    }

    /**
     * Text-based quiz with verification.
     * @example
     * const answer = await MepCLI.quizText({
     *   message: 'Who is the author of Harry Potter?',
     *   correctAnswer: 'J.K. Rowling',
     *   verify: (val) => val.includes('Rowling')
     * });
     * @param options - Correct answer string or validation function.
     * @returns A promise resolving to the input string.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/quiz-text-prompt.ts}
     */
    static quizText(options: QuizTextOptions): Promise<string> {
        return new QuizTextPrompt(options).run();
    }

    /**
     * Kanban board for organizing items.
     * @example
     * const board = await MepCLI.kanban({
     *   message: 'Project Status',
     *   columns: [
     *     { id: 'todo', title: 'To Do', items: [{ id: '1', title: 'Task A' }] },
     *     { id: 'done', title: 'Done', items: [] }
     *   ]
     * });
     * @param options - Columns and their items.
     * @returns A promise resolving to the final column state.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/kanban-prompt.ts}
     */
    static kanban<V extends KanbanItem>(options: KanbanOptions<V>): Promise<Record<string, V[]>> {
        return new KanbanPrompt(options).run();
    }

    /**
     * Time picker (HH:MM AM/PM).
     * @example
     * const time = await MepCLI.time({
     *   message: 'Wake up time',
     *   initial: '08:00 AM'
     * });
     * @param options - 12h/24h format and step intervals.
     * @returns A promise resolving to the time string.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/time-prompt.ts}
     */
    static time(options: TimeOptions): Promise<string> {
        return new TimePrompt(options).run();
    }

    /**
     * Heatmap/Weekly schedule selector.
     * @example
     * const schedule = await MepCLI.heatmap({
     *   message: 'When are you free?',
     *   rows: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
     *   columns: ['Morning', 'Afternoon', 'Evening'],
     *   legend: [
     *     { value: 0, char: ' ', color: (t) => t },
     *     { value: 1, char: '■', color: (t) => t }
     *   ]
     * });
     * @param options - Grid labels and color scale legend.
     * @returns A promise resolving to a 2D array of values.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/heatmap-prompt.ts}
     */
    static heatmap(options: HeatmapOptions): Promise<number[][]> {
        return new HeatmapPrompt(options).run();
    }

    /**
     * Byte size input (KB, MB, GB).
     * @example
     * const memory = await MepCLI.byte({
     *   message: 'Allocate memory',
     *   initial: 1024 * 1024 // 1MB
     * });
     * @param options - Min/Max bytes.
     * @returns A promise resolving to the number of bytes.
     * @see {@link https://github.com/CodeTease/mep/blob/main/example.ts}
     */
    static byte(options: ByteOptions): Promise<number> {
        return new BytePrompt(options).run();
    }

    /**
     * Slot machine style spinner.
     * @example
     * const fruit = await MepCLI.slot({
     *   message: 'Spin to win!',
     *   choices: ['🍒', '🍋', '🍇', '🍉'],
     *   rows: 3
     * });
     * @param options - Items to cycle through.
     * @returns A promise resolving to the selected item string.
     * @see {@link https://github.com/CodeTease/mep/blob/main/example.ts}
     */
    static slot(options: SlotOptions): Promise<string> {
        return new SlotPrompt(options).run();
    }

    /**
     * Rhythm game style gauge input.
     * @example
     * const result = await MepCLI.gauge({
     *   message: 'Hit the target!',
     *   safeZone: 0.2 // 20%
     * });
     * @param options - Width and difficulty (safeZone).
     * @returns A promise resolving to 'success' or 'fail'.
     * @see {@link https://github.com/CodeTease/mep/blob/main/example.ts}
     */
    static gauge(options: GaugeOptions): Promise<string> {
        return new GaugePrompt(options).run();
    }

    /**
     * Interactive calculator.
     * @example
     * const result = await MepCLI.calculator({
     *   message: 'Calculate total',
     *   initial: '10 + 5'
     * });
     * @param options - Initial expression.
     * @returns A promise resolving to the numeric result.
     * @see {@link https://github.com/CodeTease/mep/blob/main/example.ts}
     */
    static calculator(options: CalculatorOptions): Promise<number> {
        return new CalculatorPrompt(options).run();
    }

    /**
     * Emoji picker.
     * @example
     * const mood = await MepCLI.emoji({
     *   message: 'How are you feeling?',
     *   emojis: [
     *     { name: 'Happy', char: '😀' },
     *     { name: 'Sad', char: '😢' }
     *   ]
     * });
     * @param options - List of emojis and recent history.
     * @returns A promise resolving to the selected emoji name/char.
     * @see {@link https://github.com/CodeTease/mep/blob/main/example.ts}
     */
    static emoji(options: EmojiOptions): Promise<string> {
        return new EmojiPrompt(options).run();
    }

    /**
     * Match/Connect items from two lists.
     * @example
     * const pairs = await MepCLI.match({
     *   message: 'Match Capital to Country',
     *   source: ['Paris', 'London'],
     *   target: ['France', 'UK']
     * });
     * @param options - Source and Target lists.
     * @returns A promise resolving to linked pairs.
     * @see {@link https://github.com/CodeTease/mep/blob/main/example.ts}
     */
    static match(options: MatchOptions): Promise<Record<string, any[]>> {
        return new MatchPrompt(options).run();
    }

    /**
     * Git-style diff viewer.
     * @example
     * await MepCLI.diff({
     *   message: 'Review changes',
     *   original: 'foo\nbar',
     *   modified: 'foo\nbaz'
     * });
     * @param options - Original and Modified strings.
     * @returns A promise resolving to a confirmation string.
     * @see {@link https://github.com/CodeTease/mep/blob/main/example.ts}
     */
    static diff(options: DiffOptions): Promise<string> {
        return new DiffPrompt(options).run();
    }

    /**
     * Rotary dial input.
     * @example
     * const volume = await MepCLI.dial({
     *   message: 'Adjust Volume',
     *   min: 0,
     *   max: 100
     * });
     * @param options - Range and radius.
     * @returns A promise resolving to the number.
     * @see {@link https://github.com/CodeTease/mep/blob/main/example.ts}
     */
    static dial(options: DialOptions): Promise<number> {
        return new DialPrompt(options).run();
    }

    /**
     * Canvas drawing input.
     * @example
     * const art = await MepCLI.draw({
     *   message: 'Draw your signature',
     *   width: 20,
     *   height: 10
     * });
     * @param options - Canvas dimensions and export type.
     * @returns A promise resolving to the raw matrix or text.
     * @see {@link https://github.com/CodeTease/mep/blob/main/example.ts}
     */
    static draw(options: DrawOptions): Promise<string | boolean[][]> {
        return new DrawPrompt(options).run();
    }

    /**
     * Multi-column selection (Grid layout).
     * @example
     * const choice = await MepCLI.multiColumnSelect({
     *   message: 'Pick an option',
     *   choices: [
     *     { title: 'Option 1', value: 1 },
     *     { title: 'Option 2', value: 2 },
     *     { title: 'Option 3', value: 3 }
     *   ],
     *   cols: 3
     * });
     * @param options - Choices and column count.
     * @returns A promise resolving to the selected value.
     * @see {@link https://github.com/CodeTease/mep/blob/main/example.ts}
     */
    static multiColumnSelect<V>(options: MultiColumnSelectOptions<V>): Promise<V> {
        return new MultiColumnSelectPrompt(options).run();
    }

    /**
     * Fuzzy search selection.
     * @example
     * const pkg = await MepCLI.fuzzySelect({
     *   message: 'Search package',
     *   choices: [
     *     { title: 'react', value: 'react' },
     *     { title: 'react-dom', value: 'react-dom' }
     *   ]
     * });
     * @param options - Choices to fuzzy search against.
     * @returns A promise resolving to the selected value.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/selection-prompts.ts}
     */
    static fuzzySelect<V>(options: FuzzySelectOptions<V>): Promise<V> {
        return new FuzzySelectPrompt(options).run();
    }

    /**
     * Miller Columns (Cascading lists).
     * @example
     * const path = await MepCLI.miller({
     *   message: 'Navigate file structure',
     *   data: [
     *     { title: 'src', value: 'src', children: [...] }
     *   ]
     * });
     * @param options - Hierarchical data and separator.
     * @returns A promise resolving to the selected path array.
     * @see {@link https://github.com/CodeTease/mep/blob/main/example.ts}
     */
    static miller<V>(options: MillerOptions<V>): Promise<V[]> {
        return new MillerPrompt(options).run();
    }

    /**
     * Pattern Lock (Android style).
     * @example
     * const pattern = await MepCLI.pattern({
     *   message: 'Draw unlock pattern',
     *   rows: 3,
     *   cols: 3
     * });
     * @param options - Grid dimensions.
     * @returns A promise resolving to an array of point indices.
     * @see {@link https://github.com/CodeTease/mep/blob/main/example.ts}
     */
    static pattern(options: PatternOptions): Promise<number[]> {
        return new PatternPrompt(options).run();
    }

    /**
     * Region/Map Selector (ASCII Art).
     * @example
     * const zone = await MepCLI.region({
     *   message: 'Select Server Region',
     *   mapArt: `...ascii map...`,
     *   regions: [
     *     { id: 'us-east', label: 'US East', x: 10, y: 5 }
     *   ]
     * });
     * @param options - ASCII map string and interactive points.
     * @returns A promise resolving to the selected region ID.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/map-prompt.ts}
     */
    static region(options: RegionOptions): Promise<string> {
        return new RegionPrompt(options).run();
    }

    /**
     * Spreadsheet/Grid Editor.
     * @example
     * const data = await MepCLI.spreadsheet({
     *   message: 'Edit CSV Data',
     *   columns: [{ name: 'Name', key: 'name' }, { name: 'Age', key: 'age' }],
     *   data: [{ name: 'Alice', age: 25 }]
     * });
     * @param options - Column definitions and initial data rows.
     * @returns A promise resolving to the modified data array.
     * @see {@link https://github.com/CodeTease/mep/blob/main/example.ts}
     */
    static spreadsheet(options: SpreadsheetOptions): Promise<Record<string, any>[]> {
        return new SpreadsheetPrompt(options).run();
    }

    /**
     * Text Scroller (EULA/Terms).
     * @example
     * const accepted = await MepCLI.scroll({
     *   message: 'Read Terms & Conditions',
     *   content: 'Long text here...',
     *   requireScrollToBottom: true
     * });
     * @param options - Text content and scroll enforcement.
     * @returns A promise resolving to a boolean (accepted).
     * @see {@link https://github.com/CodeTease/mep/blob/main/example.ts}
     */
    static scroll(options: ScrollOptions): Promise<boolean> {
        return new ScrollPrompt(options).run();
    }

    /**
     * Breadcrumb navigation.
     * @example
     * const path = await MepCLI.breadcrumb({
     *   message: 'Navigate',
     *   root: 'Home'
     * });
     * @param options - Initial path and separator.
     * @returns A promise resolving to the final path string.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/breadcrumb-search-prompt.ts}
     */
    static breadcrumb(options: BreadcrumbOptions): Promise<string> {
        return new BreadcrumbPrompt(options).run();
    }

    /**
     * Schedule Planner (Gantt-like).
     * @example
     * const tasks = await MepCLI.schedule({
     *   message: 'Plan your day',
     *   data: [
     *     { name: 'Meeting', start: new Date(), end: new Date() }
     *   ]
     * });
     * @param options - List of scheduled tasks.
     * @returns A promise resolving to the modified task list.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/schedule-prompt.ts}
     */
    static schedule(options: ScheduleOptions): Promise<ScheduleTask[]> {
        return new SchedulePrompt(options).run();
    }

    /**
     * JSON Data Inspector.
     * @example
     * await MepCLI.inspector({
     *   message: 'Inspect Response',
     *   data: { user: { id: 1, name: 'Alice' } }
     * });
     * @param options - Data object to explore.
     * @returns A promise resolving to the viewed data.
     * @see {@link https://github.com/CodeTease/mep/blob/main/example.ts}
     */
    static inspector(options: DataInspectorOptions): Promise<any> {
        return new DataInspectorPrompt(options).run();
    }

    /**
     * Execute shell command with output streaming.
     * @experimental
     * @example
     * await MepCLI.exec({
     *   message: 'Running build...',
     *   command: 'npm run build'
     * });
     * @param options - Command string and streaming preferences.
     * @returns A promise resolving when execution completes.
     * @see {@link https://github.com/CodeTease/mep/blob/main/example.ts}
     */
    static exec(options: ExecOptions): Promise<void> {
        return new ExecPrompt(options).run();
    }

    /**
     * Keyboard Shortcut recorder.
     * @example
     * const shortcut = await MepCLI.shortcut({
     *   message: 'Press a key combination'
     * });
     * // Returns: { name: 'c', ctrl: true, shift: false, ... }
     * @param options - Initial value.
     * @returns A promise resolving to the captured key event.
     * @see {@link https://github.com/CodeTease/mep/blob/main/example.ts}
     */
    static shortcut(options: ShortcutOptions): Promise<ShortcutResult> {
        return new ShortcutPrompt(options).run();
    }

    /**
     * Seat Booking/Reservation selector.
     * @example
     * const seats = await MepCLI.seat({
     *   message: 'Choose seats',
     *   layout: [
     *     'aa_aa',
     *     'bb_bb'
     *   ],
     *   rows: ['A', 'B'],
     *   cols: ['1', '2', '', '3', '4']
     * });
     * @param options - Layout string array and labelling.
     * @returns A promise resolving to selected seat IDs.
     * @see {@link https://github.com/CodeTease/mep/blob/main/example.ts}
     */
    static seat(options: SeatOptions): Promise<string[]> {
        return new SeatPrompt(options).run();
    }

    /**
     * Range selection within a list (Shift+Click style).
     * @example
     * const chunk = await MepCLI.selectRange({
     *   message: 'Select commits to squash',
     *   choices: [
     *     { title: 'feat: A', value: 'a' },
     *     { title: 'fix: B', value: 'b' },
     *     { title: 'chore: C', value: 'c' }
     *   ]
     * });
     * @param options - Choices list.
     * @returns A promise resolving to the sub-array of values.
     * @see {@link https://github.com/CodeTease/mep/blob/main/example.ts}
     */
    static selectRange<const V>(options: SelectRangeOptions<V>): Promise<V[]> {
        return new SelectRangePrompt(options).run();
    }

    /**
     * 2D Grid Sorting.
     * @example
     * const layout = await MepCLI.sortGrid({
     *   message: 'Arrange Dashboard Widgets',
     *   data: [
     *     ['Clock', 'Weather'],
     *     ['News', 'Calendar']
     *   ]
     * });
     * @param options - 2D array of strings.
     * @returns A promise resolving to the reordered 2D array.
     * @see {@link https://github.com/CodeTease/mep/blob/main/example.ts}
     */
    static sortGrid(options: SortGridOptions): Promise<string[][]> {
        return new SortGridPrompt(options).run();
    }

    /**
     * Dependency Management (Resolves conflicts/requirements).
     * @example
     * const plugins = await MepCLI.dependency({
     *   message: 'Install Plugins',
     *   choices: [
     *     { title: 'Plugin A', value: 'a' },
     *     { title: 'Plugin B (Requires A)', value: 'b', dependsOn: ['a'] }
     *   ]
     * });
     * @param options - Choices with dependency rules.
     * @returns A promise resolving to the valid set of selections.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/dependency-prompts.ts}
     */
    static dependency<V>(options: DependencyOptions<V>): Promise<V[]> {
        return new DependencyPrompt(options).run();
    }

    /**
     * Open Source License selector.
     * @example
     * const license = await MepCLI.license({
     *   message: 'Choose a license'
     * });
     * @param options - Default license.
     * @returns A promise resolving to the SPDX ID.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/license-prompts.ts}
     */
    static license(options: LicenseOptions): Promise<string> {
        return new LicensePrompt(options).run();
    }

    /**
     * Regex Builder & Tester.
     * @example
     * const regex = await MepCLI.regex({
     *   message: 'Create email regex',
     *   tests: ['test@example.com', 'invalid-email']
     * });
     * @param options - Test cases to validate against.
     * @returns A promise resolving to the RegExp object.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/regex-prompt.ts}
     */
    static regex(options: RegexOptions): Promise<RegExp> {
        return new RegexPrompt(options).run();
    }

    /**
     * Box Model Editor (CSS style).
     * @example
     * const margin = await MepCLI.box({
     *   message: 'Set Margins',
     *   initial: { top: 10, right: 20, bottom: 10, left: 20 }
     * });
     * @param options - Initial dimensions.
     * @returns A promise resolving to the box object.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/box-prompt.ts}
     */
    static box(options: BoxOptions): Promise<{ top: number, right: number, bottom: number, left: number }> {
        return new BoxPrompt(options).run();
    }

    /**
     * Database Connection String Builder.
     * @example
     * const conn = await MepCLI.connectionString({
     *   message: 'Configure Database',
     *   initial: 'postgres://localhost:5432/mydb'
     * });
     * @param options - Initial URL.
     * @returns A promise resolving to parsed connection details.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/connection-string-prompt.ts}
     */
    static connectionString(options: ConnectionStringOptions): Promise<ConnectionStringResult> {
        return connectionString(options);
    }

    /**
     * cURL Command Builder.
     * @experimental
     * @example
     * const request = await MepCLI.curl({
     *   message: 'Build API Request',
     *   initial: 'curl -X POST https://api.example.com/v1/resource'
     * });
     * @param options - Initial command.
     * @returns A promise resolving to the parsed request object.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/curl-prompt.ts}
     */
    static curl(options: CurlOptions): Promise<CurlResult> {
        return new CurlPrompt(options).run();
    }

    /**
     * Phone Number input (with country codes).
     * @example
     * const phone = await MepCLI.phone({
     *   message: 'Enter phone number',
     *   defaultCountry: 'US'
     * });
     * @param options - Default country ISO code.
     * @returns A promise resolving to the formatted number.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/phone-prompt.ts}
     */
    static phone(options: PhoneOptions): Promise<string> {
        return new PhonePrompt(options).run();
    }

    /**
     * Fuzzy Multi-Column Selection.
     * @example
     * const user = await MepCLI.fuzzyMultiColumn({
     *   message: 'Select User',
     *   choices: [
     *     { title: 'Alice', value: 1, description: 'Admin' },
     *     { title: 'Bob', value: 2, description: 'User' }
     *   ],
     *   cols: 2
     * });
     * @param options - Choices and layout columns.
     * @returns A promise resolving to the selected value.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/fuzzy-multi-column-prompt.ts}
     */
    static fuzzyMultiColumn<V>(options: MultiColumnSelectOptions<V>): Promise<V> {
        return new FuzzyMultiColumnPrompt(options).run();
    }

    /**
     * Multi-Range Selection (Discontinuous).
     * @example
     * const ranges = await MepCLI.multiRange({
     *   message: 'Select lines to delete',
     *   choices: lines.map((l, i) => ({ title: l, value: i }))
     * });
     * @param options - Choices.
     * @returns A promise resolving to selected values.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/multi-range-prompt.ts}
     */
    static multiRange<V>(options: SelectRangeOptions<V>): Promise<V[]> {
        return new MultiRangePrompt(options).run();
    }

    /**
     * Breadcrumb Search (Navigator + Fuzzy Search).
     * @example
     * const file = await MepCLI.breadcrumbSearch({
     *   message: 'Find file',
     *   root: 'src'
     * });
     * @param options - Root path.
     * @returns A promise resolving to the selected path.
     * @see {@link https://github.com/CodeTease/mep/blob/main/examples/breadcrumb-search-prompt.ts}
     */
    static breadcrumbSearch(options: BreadcrumbOptions): Promise<string> {
        return new BreadcrumbSearchPrompt(options).run();
    }
}
