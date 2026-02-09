import { BashStrategy, PowerShellStrategy, CmdStrategy } from '../src/prompts/curl-utils';

describe('Curl Shell Strategies', () => {
    
    describe('BashStrategy', () => {
        const strategy = new BashStrategy();

        it('should wrap strings in single quotes', () => {
            expect(strategy.escape('hello')).toBe("'hello'");
        });

        it('should escape single quotes', () => {
            expect(strategy.escape("It's me")).toBe("'It'\\''s me'");
        });

        it('should handle JSON strings', () => {
            const json = '{"key":"value"}';
            expect(strategy.escape(json)).toBe("'{\"key\":\"value\"}'");
        });
    });

    describe('PowerShellStrategy', () => {
        const strategy = new PowerShellStrategy();

        it('should wrap strings in single quotes', () => {
            expect(strategy.escape('hello')).toBe("'hello'");
        });

        it('should escape single quotes by doubling them', () => {
            expect(strategy.escape("It's me")).toBe("'It''s me'");
        });

        it('should handle JSON strings', () => {
            const json = '{"key":"value"}';
            expect(strategy.escape(json)).toBe("'{\"key\":\"value\"}'");
        });
    });

    describe('CmdStrategy', () => {
        const strategy = new CmdStrategy();

        it('should wrap strings in double quotes', () => {
            expect(strategy.escape('hello')).toBe('"hello"');
        });

        it('should escape double quotes with backslash', () => {
            expect(strategy.escape('say "hello"')).toBe('"say \\"hello\\""');
        });

        it('should handle JSON strings by escaping internal double quotes', () => {
            const json = '{"key": "value"}';
            // Expect: "{\"key\": \"value\"}"
            expect(strategy.escape(json)).toBe('"{\\"key\\": \\"value\\"}"');
        });
    });

});
