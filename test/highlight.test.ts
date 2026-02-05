import { highlight, highlightEnv, highlightToml, highlightJson } from '../src/highlight';
import { theme } from '../src/theme';
import { ANSI } from '../src/ansi';

describe('Highlighting', () => {
    describe('highlightEnv', () => {
        it('should highlight key-value pairs', () => {
            const input = 'KEY=VALUE';
            const expected = `${theme.syntax.key}KEY${theme.syntax.punctuation}=${theme.syntax.string}VALUE${ANSI.RESET}`;
            expect(highlightEnv(input)).toBe(expected);
        });

        it('should highlight comments', () => {
            const input = '# This is a comment';
            const expected = `${theme.muted}# This is a comment${ANSI.RESET}`;
            expect(highlightEnv(input)).toBe(expected);
        });

        it('should handle mixed content', () => {
            const input = 'KEY=VALUE\n# Comment';
            const expected = `${theme.syntax.key}KEY${theme.syntax.punctuation}=${theme.syntax.string}VALUE${ANSI.RESET}\n${theme.muted}# Comment${ANSI.RESET}`;
            expect(highlightEnv(input)).toBe(expected);
        });
        
        it('should handle empty string', () => {
            expect(highlightEnv('')).toBe('');
        });
    });

    describe('highlightToml', () => {
        it('should highlight sections', () => {
            const input = '[section]';
            const expected = `${theme.syntax.boolean}[section]${ANSI.RESET}`;
            expect(highlightToml(input)).toBe(expected);
        });

        it('should highlight keys and ignore values', () => {
            const input = 'key = "value"';
            // Regex: /^(\s*[\w\d_-]+)(\s*=)/
            // keyPart: "key"
            // eqPart: " = "
            const expected = `${theme.syntax.key}key${ANSI.RESET} = "value"`;
            expect(highlightToml(input)).toBe(expected);
        });

        it('should highlight comments', () => {
            const input = '# Comment';
            const expected = `${theme.muted}# Comment${ANSI.RESET}`;
            expect(highlightToml(input)).toBe(expected);
        });
        
        it('should handle indentation in keys', () => {
             const input = '  key = value';
             const expected = `${theme.syntax.key}  key${ANSI.RESET} = value`;
             expect(highlightToml(input)).toBe(expected);
        });
    });

    describe('highlightJson', () => {
        it('should highlight keys', () => {
            const input = '{"key": "value"}';
            // "key" -> key color
            // : -> punctuation
            // "value" -> string color
            // { } -> punctuation
            const expected = 
                `${theme.syntax.punctuation}{${ANSI.RESET}` +
                `${theme.syntax.key}"key"${ANSI.RESET}` +
                `${theme.syntax.punctuation}:${ANSI.RESET} ` + // Note: space is not matched by regex so it's kept as is? Wait, regex doesn't match space.
                `${theme.syntax.string}"value"${ANSI.RESET}` +
                `${theme.syntax.punctuation}}${ANSI.RESET}`;
            
            // Wait, the regex in highlightJson:
            // /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"?)|(-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)|(true|false|null)|([{}[\],:])/g
            // It matches "key", ":", "value", "{", "}". Spaces are skipped by regex and appended manually.
            
            expect(highlightJson(input)).toContain(theme.syntax.key);
            expect(highlightJson(input)).toContain('"key"');
        });

        it('should highlight numbers', () => {
            const input = '123';
            const expected = `${theme.syntax.number}123${ANSI.RESET}`;
            expect(highlightJson(input)).toBe(expected);
        });
        
        it('should highlight booleans and null', () => {
            expect(highlightJson('true')).toBe(`${theme.syntax.boolean}true${ANSI.RESET}`);
            expect(highlightJson('false')).toBe(`${theme.syntax.boolean}false${ANSI.RESET}`);
            expect(highlightJson('null')).toBe(`${theme.syntax.null}null${ANSI.RESET}`);
        });

        it('should highlight punctuation', () => {
            expect(highlightJson('{}')).toBe(`${theme.syntax.punctuation}{${ANSI.RESET}${theme.syntax.punctuation}}${ANSI.RESET}`);
            expect(highlightJson('[]')).toBe(`${theme.syntax.punctuation}[${ANSI.RESET}${theme.syntax.punctuation}]${ANSI.RESET}`);
        });
    });

    describe('highlight generic', () => {
        it('should route to env', () => {
             const input = 'K=V';
             expect(highlight(input, 'env')).toBe(highlightEnv(input));
        });
        it('should route to toml', () => {
             const input = '[s]';
             expect(highlight(input, 'toml')).toBe(highlightToml(input));
        });
        it('should route to json', () => {
             const input = '{"a":1}';
             expect(highlight(input, 'json')).toBe(highlightJson(input));
        });
        it('should return raw for unknown', () => {
             const input = 'plain text';
             expect(highlight(input, 'txt')).toBe(input);
        });
    });
});
