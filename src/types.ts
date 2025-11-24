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
}

export interface TextOptions extends BaseOptions {
    placeholder?: string;
    initial?: string;
    validate?: (value: string) => string | boolean | Promise<string | boolean>;
    isPassword?: boolean;
    multiline?: boolean;
}

export interface Separator {
    separator: true;
    text?: string;
}

export interface SelectChoice {
    title: string;
    value: any;
    description?: string; // Optional hint
}

export interface SelectOptions extends BaseOptions {
    choices: (SelectChoice | Separator)[];
}

// --- Checkbox Types ---
export interface CheckboxChoice extends SelectChoice {
    selected?: boolean; // Default checked state
}

export interface CheckboxOptions extends BaseOptions {
    choices: CheckboxChoice[];
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
