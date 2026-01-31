/**
 * Type definitions for Mep CLI interactions.
 */

export interface ThemeConfig {
    main: string;    // Primary branding color (e.g., cursor, selected item, values)
    success: string; // Success messages, checkmarks
    error: string;   // Error messages, cross marks
    muted: string;   // Placeholders, help text, unselected items
    title: string;   // Questions/Titles
}

export interface BaseOptions {
    message: string;
    mouse?: boolean;
}

export interface MouseEvent {
    name: 'mouse';
    x: number;
    y: number;
    button: number;
    action: 'press' | 'release' | 'move' | 'scroll';
    scroll?: 'up' | 'down';
    shift?: boolean;
    ctrl?: boolean;
    meta?: boolean;
}

export interface TextOptions extends BaseOptions {
    placeholder?: string;
    initial?: string;
    validate?: (value: string) => string | boolean | Promise<string | boolean>;
    isPassword?: boolean;
    multiline?: boolean;
    mask?: string;
}

export interface Separator {
    separator: true;
    text?: string;
}

export interface SelectChoice<V> {
    title: string;
    value: V;
    description?: string; // Optional hint
}

export interface SelectOptions<V> extends BaseOptions {
    choices: (SelectChoice<V> | Separator)[];
}

export interface TransferOptions<V> extends BaseOptions {
    source: (string | SelectChoice<V>)[];
    target?: (string | SelectChoice<V>)[];
}

export interface CronOptions extends BaseOptions {
    initial?: string;
    placeholder?: string;
}

// --- Checkbox Types ---
export interface CheckboxChoice<V> extends SelectChoice<V> {
    selected?: boolean; // Default checked state
}

export interface CheckboxOptions<V> extends BaseOptions {
    choices: CheckboxChoice<V>[];
    min?: number; // Minimum selections required (optional)
    max?: number; // Maximum selections allowed (optional)
}

export interface ConfirmOptions extends BaseOptions {
    initial?: boolean;
}

export interface NumberOptions extends BaseOptions {
    initial?: number;
    min?: number;
    max?: number;
    step?: number;
    placeholder?: string;
}

export interface ToggleOptions extends BaseOptions {
    initial?: boolean;
    activeText?: string;
    inactiveText?: string;
}

// --- New Types ---

export interface ListOptions extends BaseOptions {
    placeholder?: string;
    initial?: string[];
    validate?: (value: string[]) => string | boolean | Promise<string | boolean>;
}

export interface SliderOptions extends BaseOptions {
    min: number;
    max: number;
    initial?: number;
    step?: number;
    unit?: string;
}

export interface RangeOptions extends BaseOptions {
    min: number;
    max: number;
    initial?: [number, number];
    step?: number;
    unit?: string;
}

export interface RatingOptions extends BaseOptions {
    min?: number;
    max?: number;
    initial?: number;
}

export interface DateOptions extends BaseOptions {
    initial?: Date;
    min?: Date;
    max?: Date;
}

export interface FileOptions extends BaseOptions {
    basePath?: string;
    extensions?: string[];
    onlyDirectories?: boolean;
}

export interface MultiSelectOptions<V> extends CheckboxOptions<V> {
    // Inherits choices, min, max
}

export interface AutocompleteOptions<V> extends BaseOptions {
    suggest: (input: string) => Promise<SelectChoice<V>[]>;
    limit?: number; // defaults to 10
    fallback?: string; // Message when no results
    initial?: string; // Initial query
}

export interface SortOptions extends BaseOptions {
    items: string[];
}

export interface EditorOptions extends BaseOptions {
    initial?: string;
    extension?: string;
    waitUserInput?: boolean;
}

export interface TableRow<V> {
    value: V;
    row: string[];
}

export interface TableOptions<V> extends BaseOptions {
    columns: string[];
    data: TableRow<V>[];
    rows?: number; // display rows
}

export interface TreeNode<V> {
    title: string;
    value: V;
    children?: TreeNode<V>[];
    expanded?: boolean;
    disabled?: boolean;
    selected?: boolean | 'indeterminate';
}

export interface TreeOptions<V> extends BaseOptions {
    data: TreeNode<V>[];
    initial?: V;
    indent?: number;
}

export interface KeypressOptions extends BaseOptions {
    keys?: string[];
    showInvisible?: boolean;
}

export interface FormField {
    name: string;
    message: string;
    initial?: string;
    validate?: (value: string) => string | boolean | Promise<string | boolean>;
}

export interface FormOptions extends BaseOptions {
    fields: FormField[];
}

export interface SnippetOptions extends BaseOptions {
    template: string;
    values?: Record<string, string>;
    fields?: Record<string, {
         message?: string;
         validate?: (value: string) => string | boolean;
    }>;
}

export interface SpamOptions extends BaseOptions {
    threshold: number; 
    spamKey?: string; 
    decay?: boolean; 
}

export interface WaitOptions extends BaseOptions {
    seconds: number;
    autoSubmit?: boolean; 
}

export interface CodeOptions extends BaseOptions {
    template: string;
    language?: 'json';
    /**
     * Enable syntax highlighting (Experimental).
     * @default true
     */
    highlight?: boolean;
}

export interface TreeSelectNode<V> {
    title: string;
    value: V;
    children?: TreeSelectNode<V>[];
    expanded?: boolean;
    disabled?: boolean;
    selected?: boolean | 'indeterminate';
}

export interface TreeSelectOptions<V> extends BaseOptions {
    data: TreeSelectNode<V>[];
    initial?: V[];
    indent?: number;
}

export interface ColorOptions extends BaseOptions {
    initial?: string; // Hex support (e.g. "#3B82F6")
    format?: 'hex' | 'rgb' | 'hsl';
}

export interface GridOptions extends BaseOptions {
    rows: string[];
    columns: string[];
    initial?: boolean[][]; // Trạng thái selected ban đầu
}

export interface CalendarOptions extends BaseOptions {
    mode?: 'single' | 'range';
    initial?: Date | [Date, Date]; // Single date or Range tuple
    min?: Date;
    max?: Date;
    weekStart?: 0 | 1; // 0 = Sunday, 1 = Monday
}

// --- New Prompts ---
export interface MapOptions extends BaseOptions {
    initial?: Record<string, string>;
}

export interface SemVerOptions extends BaseOptions {
    currentVersion: string;
}

export interface IPOptions extends BaseOptions {
    initial?: string;
}

export interface OTPOptions extends BaseOptions {
    length?: number;
    mask?: string;
    secure?: boolean;
    placeholder?: string;
}

export interface QuizSelectOptions<V> extends SelectOptions<V> {
    correctValue: V;
    explanation?: string;
}

export interface QuizTextOptions extends TextOptions {
    verify?: (value: string) => boolean | Promise<boolean>;
    correctAnswer: string;
    explanation?: string;
}

// --- Kanban Types ---
export interface KanbanItem {
    id: string;
    title: string;
    [key: string]: any;
}

export interface KanbanColumn<V extends KanbanItem> {
    id: string;
    title: string;
    items: V[];
}

export interface KanbanOptions<V extends KanbanItem> extends BaseOptions {
    columns: KanbanColumn<V>[];
}

// --- Time Scroller Types ---
export interface TimeOptions extends BaseOptions {
    format?: '12h' | '24h';
    step?: number;
    initial?: Date | string;
}

// --- Heatmap Types ---
export interface HeatmapLegend {
    value: number;
    char: string;
    color: (str: string) => string;
}

export interface HeatmapOptions extends BaseOptions {
    rows: string[];
    columns: string[];
    legend: HeatmapLegend[];
    initial?: number[][];
}

export interface ByteOptions extends BaseOptions {
    initial?: number; // Field initial in bytes
    min?: number;     // Min bytes
    max?: number;     // Max bytes
}

// --- Slot Machine Types ---
export interface SlotOptions extends BaseOptions {
    choices: string[];
    rows?: number; // Default: 3
    initial?: number; // Default: 0
}

// --- Rhythm Gauge Types ---
export interface GaugeOptions extends BaseOptions {
    theme?: Partial<ThemeConfig>;
    width?: number; // Default: 40
    /** Safe zone width as a percentage (0-1) or absolute character count (>1). Default: 0.2 (20%) */
    safeZone?: number; 
}

// --- Calculator Types ---
export interface CalculatorOptions extends BaseOptions {
    initial?: string;
    variables?: Record<string, number>;
    precision?: number;
    placeholder?: string;
}

// --- Emoji Types ---
export interface EmojiItem {
    char: string;
    name: string;
    description?: string;
}

export interface EmojiOptions extends BaseOptions {
    emojis: EmojiItem[];
    recent?: string[]; // Array of emoji names
    cols?: number;
}

// --- Match Types ---
export interface MatchItem {
    id: string;
    label: string;
    value?: any;
}

export interface MatchOptions extends BaseOptions {
    source: (string | MatchItem)[];
    target: (string | MatchItem)[];
    constraints?: {
        required?: boolean; // Must link all source items?
        oneToMany?: boolean; // Can a target receive multiple sources?
    };
}
