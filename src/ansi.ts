/**
 * ANSI Escape Codes
 * Manual definitions to maintain zero-dependency status.
 */

export const ANSI = {
    RESET: '\x1b[0m',
    BOLD: '\x1b[1m',
    DIM: '\x1b[2m',
    ITALIC: '\x1b[3m',
    
    // Colors
    FG_GREEN: '\x1b[32m',
    FG_CYAN: '\x1b[36m',
    FG_YELLOW: '\x1b[33m',
    FG_RED: '\x1b[31m',
    FG_GRAY: '\x1b[90m',
    FG_WHITE: '\x1b[37m',

    // Cursor & Erasing
    ERASE_LINE: '\x1b[2K',      // Clear current line
    CURSOR_LEFT: '\x1b[1000D',  // Move cursor to start of line
    HIDE_CURSOR: '\x1b[?25l',
    SHOW_CURSOR: '\x1b[?25h',
    UP: '\x1b[A',
    DOWN: '\x1b[B',
};