import { detectCapabilities } from './utils';

export interface SymbolDefinition {
    /** Used for success messages or valid states */
    tick: string;
    /** Used for error messages or invalid states */
    cross: string;
    /** Used to point to the current selection */
    pointer: string;
    /** Used for separators or sliders */
    line: string;
    /** Used for checked state in checkboxes/radio */
    checked: string;
    /** Used for unchecked state in checkboxes/radio */
    unchecked: string;
    /** Animation frames for the spinner */
    spinner: string[];
}

const UnicodeSymbols: SymbolDefinition = {
    tick: '✔',
    cross: '✖',
    pointer: '❯',
    line: '─',
    checked: '◉',
    unchecked: '◯',
    spinner: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
};

const AsciiSymbols: SymbolDefinition = {
    tick: '+',
    cross: 'x',
    pointer: '>',
    line: '-',
    checked: '[x]',
    unchecked: '[ ]',
    spinner: ['|', '/', '-', '\\']
};

const capabilities = detectCapabilities();
const useUnicode = capabilities.hasUnicode && process.env.MEP_NO_UNICODE !== '1';

export const symbols: SymbolDefinition = useUnicode ? UnicodeSymbols : AsciiSymbols;
