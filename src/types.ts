/**
 * Type definitions for Mep CLI interactions.
 */

export interface ThemeConfig {
	main: string; // Primary branding color (e.g., cursor, selected item, values)
	success: string; // Success messages, checkmarks
	error: string; // Error messages, cross marks
	muted: string; // Placeholders, help text, unselected items
	title: string; // Questions/Titles
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

export interface SelectChoice<Value> {
	title: string;
	value: Value;
	description?: string; // Optional hint
}

export interface SelectOptions<Value> extends BaseOptions {
	choices: (SelectChoice<Value> | Separator)[];
}

// --- Checkbox Types ---
export interface CheckboxChoice<Value> extends SelectChoice<Value> {
	selected?: boolean; // Default checked state
}

export interface CheckboxOptions<Value> extends BaseOptions {
	choices: CheckboxChoice<Value>[];
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

export interface MultiSelectOptions<Value> extends CheckboxOptions<Value> {
	// Inherits choices, min, max
}
