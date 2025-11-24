import { ANSI } from './ansi';
import { ThemeConfig } from './types';

export const theme: ThemeConfig = {
    main: ANSI.FG_CYAN,
    success: ANSI.FG_GREEN,
    error: ANSI.FG_RED,
    muted: ANSI.FG_GRAY,
    title: ANSI.RESET
};
