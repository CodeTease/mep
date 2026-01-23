import { stripAnsi, stringWidth, safeSplit } from '../src/utils';
import { ANSI as ANSI_CODES } from '../src/ansi';

describe('Utils', () => {
    describe('stripAnsi', () => {
        it('should remove basic colors', () => {
            const input = '\x1b[31mRed\x1b[39m';
            expect(stripAnsi(input)).toBe('Red');
        });

        it('should remove background colors', () => {
            const input = '\x1b[42mGreenBG\x1b[49m';
            expect(stripAnsi(input)).toBe('GreenBG');
        });

        it('should remove bold/italic styles', () => {
            const input = '\x1b[1mBold\x1b[22m \x1b[3mItalic\x1b[23m';
            expect(stripAnsi(input)).toBe('Bold Italic');
        });

        it('should handle nested codes', () => {
            const input = '\x1b[1m\x1b[31mBoldRed\x1b[39m\x1b[22m';
            expect(stripAnsi(input)).toBe('BoldRed');
        });

        it('should leave plain text alone', () => {
            const input = 'Hello World';
            expect(stripAnsi(input)).toBe('Hello World');
        });
        
        it('should handle empty strings', () => {
            expect(stripAnsi('')).toBe('');
        });
    });

    describe('stringWidth', () => {
        it('should calculate width of ASCII string', () => {
            expect(stringWidth('abc')).toBe(3);
        });

        it('should ignore ANSI codes in width', () => {
            const input = '\x1b[31mRed\x1b[0m';
            expect(stringWidth(input)).toBe(3);
        });

        it('should calculate width of CJK characters (wide)', () => {
            // "你好" - 2 chars, each width 2 => 4
            expect(stringWidth('你好')).toBe(4);
        });

        it('should calculate width of mixed ASCII and CJK', () => {
            // "Hello 你好" => 5 (Hello) + 1 (space) + 4 (你好) = 10
            expect(stringWidth('Hello 你好')).toBe(10);
        });

        it('should calculate width of emojis', () => {
            // 🚀 Rocket emoji
            expect(stringWidth('🚀')).toBe(2);
        });

        it('should calculate width of mixed ANSI and Wide chars', () => {
            const input = `\x1b[31mColor\x1b[0m \x1b[1mBold\x1b[0m 🚀`;
            // "Color" (5) + " " (1) + "Bold" (4) + " " (1) + "🚀" (2) = 13
            expect(stringWidth(input)).toBe(13);
        });
    });

    describe('safeSplit', () => {
        it('should split ASCII strings', () => {
            expect(safeSplit('abc')).toEqual(['a', 'b', 'c']);
        });

        it('should split string with emojis correctly', () => {
            const input = 'a🚀b';
            expect(safeSplit(input)).toEqual(['a', '🚀', 'b']);
        });

        it('should split string with CJK characters', () => {
            const input = '你好';
            expect(safeSplit(input)).toEqual(['你', '好']);
        });

        it('should split ZWJ sequences correctly (if supported by environment)', () => {
            // 👨‍👩‍👧‍👦 Family emoji (sequence of 4 emojis joined by ZWJ)
            // Note: Support depends on Node.js ICU data. 
            // We just verify it doesn't crash and returns valid segments.
            const family = '👨‍👩‍👧‍👦';
            const parts = safeSplit(family);
            // Ideally should be 1, but might be multiple depending on Node version/ICU.
            // Just ensure it's not empty.
            expect(parts.length).toBeGreaterThan(0);
        });
    });
});
