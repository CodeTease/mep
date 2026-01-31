/**
 * ANSI Escape Codes
 * Manual definitions to maintain zero-dependency status.
 */

export const ANSI = {
    RESET: '\x1b[0m',
    BOLD: '\x1b[1m',
    DIM: '\x1b[2m',
    ITALIC: '\x1b[3m',
    UNDERLINE: '\x1b[4m',
    REVERSE: '\x1b[7m',
    
    // Colors
    FG_GREEN: '\x1b[32m',
    FG_CYAN: '\x1b[36m',
    FG_YELLOW: '\x1b[33m',
    FG_RED: '\x1b[31m',
    FG_GRAY: '\x1b[90m',
    FG_WHITE: '\x1b[37m',
    FG_BLUE: '\x1b[34m',
    FG_MAGENTA: '\x1b[35m',
    FG_BLACK: '\x1b[30m',

    BG_YELLOW: '\x1b[43m',
    BG_BLUE: '\x1b[44m',
    BG_CYAN: '\x1b[46m',
    BG_GREEN: '\x1b[42m',
    BG_RED: '\x1b[41m',

    // Cursor & Erasing
    ERASE_LINE: '\x1b[2K',      // Clear current line
    ERASE_DOWN: '\x1b[J',       // Clear from cursor to end of screen
    CURSOR_LEFT: '\x1b[1000D',  // Move cursor to start of line
    HIDE_CURSOR: '\x1b[?25l',
    SHOW_CURSOR: '\x1b[?25h',
    UP: '\x1b[A',
    DOWN: '\x1b[B',

    // Mouse Tracking (SGR Protocol)
    SET_ANY_EVENT_MOUSE: '\x1b[?1003h',
    SET_SGR_EXT_MODE_MOUSE: '\x1b[?1006h',
    DISABLE_MOUSE: '\x1b[?1003l\x1b[?1006l',
};
