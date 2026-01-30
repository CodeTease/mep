// src/utils.ts

/**
 * Detects terminal capabilities.
 */
export function detectCapabilities() {
    const env = process.env;
    
    // Check for CI
    const isCI = !!env.CI;
    
    // Check for True Color support
    const hasTrueColor = env.COLORTERM === 'truecolor' || !!env.WT_SESSION;
    
    // Check if it is a TTY
    const isTTY = process.stdout.isTTY;
    const isWindows = process.platform === 'win32';

    // Logic detect Unicode xịn hơn
    const isUnicodeSupported = () => {
        // 1. Windows: Check specific environmental variables
        if (isWindows) {
            // Windows Terminal
            if (env.WT_SESSION) return true;
            // VSCode terminal
            if (env.TERM_PROGRAM === 'vscode') return true;
            // Modern terminals setting TERM (e.g. Alacritty, Git Bash, Cygwin)
            if (env.TERM === 'xterm-256color' || env.TERM === 'alacritty') return true;
            // ConEmu / Cmder
            if (env.ConEmuTask) return true;
            
            // CI on Windows typically supports Unicode.
            if (isCI) return true;

            // Default cmd.exe / old powershell => False (ASCII)
            return false;
        }

        // 2. Non-Windows (Linux/macOS)
        if (env.TERM_PROGRAM === 'Apple_Terminal') return true;

        // Check if the LANG or LC_ALL variable contains UTF-8.
        const lang = env.LANG || '';
        const lcAll = env.LC_ALL || '';
        
        return (lang && lang.toUpperCase().endsWith('UTF-8')) ||
               (lcAll && lcAll.toUpperCase().endsWith('UTF-8'));
    };

    return {
        isCI,
        hasTrueColor,
        // Enable Unicode only if it's TTY and environment supports it.
        hasUnicode: isTTY && isUnicodeSupported(),
        // Check if mouse should be enabled (TTY and not CI, or explicit override)
        // SGR is widely supported in modern terminals
        hasMouse: isTTY && !isCI
    };
}

/**
 * Strips ANSI escape codes from a string.
 */
export function stripAnsi(str: string): string {
    return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Sorted array of Unicode ranges that are typically full-width (2 columns).
 * Includes CJK, Emoji, Fullwidth forms, etc.
 * Format: [start, end] inclusive.
 */
const WIDE_RANGES: [number, number][] = [
    [0x1100, 0x11FF], // Hangul Jamo
    [0x2E80, 0x2EFF], // CJK Radicals Supplement
    [0x2F00, 0x2FDF], // Kangxi Radicals
    [0x3000, 0x303F], // CJK Symbols and Punctuation
    [0x3040, 0x309F], // Hiragana
    [0x30A0, 0x30FF], // Katakana
    [0x3100, 0x312F], // Bopomofo
    [0x3130, 0x318F], // Hangul Compatibility Jamo
    [0x3200, 0x32FF], // Enclosed CJK Letters and Months
    [0x3300, 0x33FF], // CJK Compatibility
    [0x3400, 0x4DBF], // CJK Unified Ideographs Extension A
    [0x4E00, 0x9FFF], // CJK Unified Ideographs
    [0xA960, 0xA97F], // Hangul Jamo Extended-A
    [0xAC00, 0xD7AF], // Hangul Syllables
    [0xD7B0, 0xD7FF], // Hangul Jamo Extended-B
    [0xF900, 0xFAFF], // CJK Compatibility Ideographs
    [0xFE10, 0xFE1F], // Vertical Forms
    [0xFE30, 0xFE4F], // CJK Compatibility Forms
    [0xFE50, 0xFE6F], // Small Form Variants
    [0xFF01, 0xFF60], // Fullwidth ASCII variants
    [0xFFE0, 0xFFE6], // Fullwidth currency/symbols
    [0x1F300, 0x1F6FF], // Miscellaneous Symbols and Pictographs (Emoji)
    [0x1F900, 0x1F9FF], // Supplemental Symbols and Pictographs
];

/**
 * Binary search to check if a code point is in the wide ranges.
 */
function isWideCodePoint(cp: number): boolean {
    let low = 0;
    let high = WIDE_RANGES.length - 1;

    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const [start, end] = WIDE_RANGES[mid];

        if (cp >= start && cp <= end) {
            return true;
        } else if (cp < start) {
            high = mid - 1;
        } else {
            low = mid + 1;
        }
    }
    return false;
}

/**
 * Calculates the visual width of a string.
 * Uses binary search for wide characters.
 * Handles ANSI codes (zero width).
 */
export function stringWidth(str: string): number {
    let width = 0;
    let inAnsi = false;

    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);

        // Simple ANSI parser state check
        if (str[i] === '\x1b') {
            inAnsi = true;
            continue;
        }
        if (inAnsi) {
            if (str[i] === '[') {
                // Continue, this is the start of CSI
                continue;
            }
            if ((str[i] >= '@' && str[i] <= '~')) {
                inAnsi = false;
            }
            continue;
        }

        // Handle surrogate pairs for high code points (Emoji)
        let cp = code;
        if (code >= 0xD800 && code <= 0xDBFF && i + 1 < str.length) {
            const next = str.charCodeAt(i + 1);
            if (next >= 0xDC00 && next <= 0xDFFF) {
                // Calculate code point from surrogate pair
                cp = (code - 0xD800) * 0x400 + (next - 0xDC00) + 0x10000;
                i++; // Skip next char
            }
        }

        width += isWideCodePoint(cp) ? 2 : 1;
    }
    return width;
}

/**
 * Safely splits a string into an array of grapheme clusters.
 * Uses Intl.Segmenter (Node 16+).
 */
export function safeSplit(str: string): string[] {
    // @ts-ignore - Intl.Segmenter is available in Node 16+ but TS might complain depending on lib settings
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    const segments = segmenter.segment(str);
    const result: string[] = [];
    for (const segment of segments) {
        result.push(segment.segment);
    }
    return result;
}
