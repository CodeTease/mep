import { highlight, highlightEnv, highlightToml, highlightJson, highlightCsv, highlightShell, highlightProperties } from '../src/highlight';
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
            const expected = `${theme.syntax.key}[section]${ANSI.RESET}`;
            expect(highlightToml(input)).toBe(expected);
        });

        it('should highlight keys and ignore values', () => {
            const input = 'key = "value"';
            // Regex: /^(\s*[\w\d_-]+)(\s*=)/
            // keyPart: "key"
            // eqPart: " = "
            const expected = `${theme.syntax.key}key${ANSI.RESET}${theme.syntax.punctuation} =${theme.syntax.string} "value"${ANSI.RESET}`;
            expect(highlightToml(input)).toBe(expected);
        });

        it('should highlight comments', () => {
            const input = '# Comment';
            const expected = `${theme.muted}# Comment${ANSI.RESET}`;
            expect(highlightToml(input)).toBe(expected);
        });
        
        it('should handle indentation in keys', () => {
             const input = '  key = value';
             const expected = `${theme.syntax.key}  key${ANSI.RESET}${theme.syntax.punctuation} =${theme.syntax.string} value${ANSI.RESET}`;
             expect(highlightToml(input)).toBe(expected);
        });
    });

    describe('highlightJson', () => {
        it('should highlight keys', () => {
            const input = '{"key": "value"}';
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

    describe('highlightCsv', () => {
        it('should highlight columns with cycling colors', () => {
            const input = 'a,b,c,d,e';
            // colors: string, key, number, boolean
            const expected = `${theme.syntax.string}a${ANSI.RESET}${theme.syntax.punctuation},${ANSI.RESET}` +
                             `${theme.syntax.key}b${ANSI.RESET}${theme.syntax.punctuation},${ANSI.RESET}` +
                             `${theme.syntax.number}c${ANSI.RESET}${theme.syntax.punctuation},${ANSI.RESET}` +
                             `${theme.syntax.boolean}d${ANSI.RESET}${theme.syntax.punctuation},${ANSI.RESET}` +
                             `${theme.syntax.string}e${ANSI.RESET}`;
            expect(highlightCsv(input)).toBe(expected);
        });

        it('should handle quoted values containing commas', () => {
            // Regex: line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            const input = '"a,b",c';
            // "a,b" is one part (index 0 -> string color)
            // c is second part (index 1 -> key color)
            const expected = `${theme.syntax.string}"a,b"${ANSI.RESET}${theme.syntax.punctuation},${ANSI.RESET}` +
                             `${theme.syntax.key}c${ANSI.RESET}`;
            expect(highlightCsv(input)).toBe(expected);
        });
        
        it('should handle empty input', () => {
             expect(highlightCsv('')).toBe('');
        });
    });

    describe('highlightShell', () => {
        it('should highlight comments', () => {
            const input = '# comment';
            const expected = `${theme.muted}# comment${ANSI.RESET}`;
            expect(highlightShell(input)).toBe(expected);
        });

        it('should highlight keywords', () => {
            const input = 'if';
            const expected = `${theme.syntax.boolean}if${ANSI.RESET}`;
            expect(highlightShell(input)).toBe(expected);
        });

        it('should highlight variables', () => {
            const input = '$VAR';
            const expected = `${theme.syntax.key}$VAR${ANSI.RESET}`;
            expect(highlightShell(input)).toBe(expected);
        });

        it('should highlight flags', () => {
            const input = '-f --flag';
            // space is preserved
            const expected = `${theme.syntax.number}-f${ANSI.RESET} ${theme.syntax.number}--flag${ANSI.RESET}`;
            expect(highlightShell(input)).toBe(expected);
        });
        
         it('should handle empty input', () => {
             expect(highlightShell('')).toBe('');
        });
    });

    describe('highlightProperties', () => {
        it('should highlight comments with #', () => {
            const input = '# comment';
            const expected = `${theme.muted}# comment${ANSI.RESET}`;
            expect(highlightProperties(input)).toBe(expected);
        });

        it('should highlight comments with !', () => {
            const input = '! comment';
            const expected = `${theme.muted}! comment${ANSI.RESET}`;
            expect(highlightProperties(input)).toBe(expected);
        });

        it('should highlight key=value', () => {
            const input = 'key=value';
            const expected = `${theme.syntax.key}key${theme.syntax.punctuation}=${theme.syntax.string}value${ANSI.RESET}`;
            expect(highlightProperties(input)).toBe(expected);
        });

        it('should highlight key:value', () => {
            const input = 'key:value';
            const expected = `${theme.syntax.key}key${theme.syntax.punctuation}:${theme.syntax.string}value${ANSI.RESET}`;
            expect(highlightProperties(input)).toBe(expected);
        });
        
        it('should handle empty input', () => {
             expect(highlightProperties('')).toBe('');
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
        it('should route to csv', () => {
             const input = 'a,b';
             expect(highlight(input, 'csv')).toBe(highlightCsv(input));
        });
        it('should route to shell', () => {
             const input = 'echo hi';
             expect(highlight(input, 'sh')).toBe(highlightShell(input));
             expect(highlight(input, 'bash')).toBe(highlightShell(input));
             expect(highlight(input, 'zsh')).toBe(highlightShell(input));
        });
        it('should route to properties', () => {
             const input = 'k=v';
             expect(highlight(input, 'properties')).toBe(highlightProperties(input));
             expect(highlight(input, 'props')).toBe(highlightProperties(input));
             expect(highlight(input, 'conf')).toBe(highlightProperties(input));
        });
        it('should return raw for unknown', () => {
             const input = 'plain text';
             expect(highlight(input, 'txt')).toBe(input);
        });
    });
});
