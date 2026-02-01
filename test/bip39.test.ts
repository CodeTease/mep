import { validateMnemonic, isWordValid, DEFAULT_WORDLIST } from '../src/bip39';

describe('BIP39 Utilities', () => {
    describe('isWordValid', () => {
        it('should return true for valid words', () => {
            expect(isWordValid('abandon')).toBe(true);
            expect(isWordValid('zoo')).toBe(true);
        });

        it('should return false for invalid words', () => {
            expect(isWordValid('foo')).toBe(false);
            expect(isWordValid('zzzzzzz')).toBe(false);
            expect(isWordValid('')).toBe(false);
        });
    });

    describe('validateMnemonic', () => {
        // Test Vector 1 (12 words - 0 entropy)
        it('should validate correct 12-word mnemonic (0 entropy)', () => {
            const mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about".split(' ');
            expect(validateMnemonic(mnemonic)).toBe(true);
        });

        it('should fail 12-word mnemonic with wrong checksum', () => {
             // 'art' instead of 'about'
             const mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art".split(' ');
             expect(validateMnemonic(mnemonic)).toBe(false);
        });

        // Test Vector 2 (15 words - 0 entropy)
        it('should validate correct 15-word mnemonic (0 entropy)', () => {
            // Last word 'address'
            const mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon address".split(' ');
            expect(validateMnemonic(mnemonic)).toBe(true);
        });

        // Test Vector 3 (18 words - 0 entropy)
        it('should validate correct 18-word mnemonic (0 entropy)', () => {
            // Last word 'agent'
            const mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon agent".split(' ');
            expect(validateMnemonic(mnemonic)).toBe(true);
        });

        // Test Vector 4 (21 words - 0 entropy)
        it('should validate correct 21-word mnemonic (0 entropy)', () => {
            // Last word 'admit'
            const mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon admit".split(' ');
            expect(validateMnemonic(mnemonic)).toBe(true);
        });

        // Test Vector 5 (24 words - 0 entropy)
        it('should validate correct 24-word mnemonic (0 entropy)', () => {
            // Last word 'art'
            const mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art".split(' ');
            expect(validateMnemonic(mnemonic)).toBe(true);
        });

        it('should fail 24-word mnemonic with wrong checksum', () => {
             const mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon zoo".split(' ');
             expect(validateMnemonic(mnemonic)).toBe(false);
        });

        it('should return false for invalid word length', () => {
            const mnemonic = "abandon abandon".split(' ');
            expect(validateMnemonic(mnemonic)).toBe(false);
        });

        it('should return false if a word is not in wordlist', () => {
            // 'foobar' is not in list
            const mnemonic = "foobar abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about".split(' ');
            expect(validateMnemonic(mnemonic)).toBe(false);
        });
    });
});
