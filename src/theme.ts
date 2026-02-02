import { ANSI } from './ansi';
import { ThemeConfig } from './types';

export const theme: ThemeConfig = {
    main: ANSI.FG_CYAN,
    success: ANSI.FG_GREEN,
    error: ANSI.FG_RED,
    muted: ANSI.FG_GRAY,
    title: ANSI.RESET,
    // Add specific syntax colors
    syntax: {
        key: ANSI.FG_CYAN,
        string: ANSI.FG_GREEN,
        number: ANSI.FG_YELLOW,
        boolean: ANSI.FG_MAGENTA,
        null: ANSI.FG_RED,
        punctuation: ANSI.FG_WHITE,
    }
};