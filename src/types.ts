/**
 * Type definitions for Mep CLI interactions.
 */

export interface BaseOptions {
    message: string;
}

export interface TextOptions extends BaseOptions {
    placeholder?: string;
    initial?: string;
    validate?: (value: string) => string | boolean;
    isPassword?: boolean;
}

export interface SelectChoice {
    title: string;
    value: any;
    description?: string; // Optional hint
}

export interface SelectOptions extends BaseOptions {
    choices: SelectChoice[];
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