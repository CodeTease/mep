import { createHash } from 'crypto';
import { WORDLIST_ENGLISH } from './assets/bip39_wordlists';

// Default to English if no wordlist is provided
export const DEFAULT_WORDLIST = WORDLIST_ENGLISH;

/**
 * Validates a mnemonic phrase against a wordlist and checksum.
 * Supports flexible lengths: 12, 15, 18, 21, 24 words.
 */
export function validateMnemonic(words: string[], wordlist: string[] = DEFAULT_WORDLIST): boolean {
    const length = words.length;
    // Allowed lengths: 12, 15, 18, 21, 24
    if (![12, 15, 18, 21, 24].includes(length)) {
        return false;
    }

    // Check if all words are in the wordlist
    // using indexOf is faster than includes for simple existence checks in arrays
    const indices = words.map(w => wordlist.indexOf(w));
    if (indices.some(i => i === -1)) {
        return false;
    }

    // Convert indices to 11-bit binary strings
    const bits = indices.map(i => i.toString(2).padStart(11, '0')).join('');

    // Calculate checksum length: Total bits / 33
    // Example: 12 words * 11 bits = 132 bits. 132 / 33 = 4 bits checksum.
    const checksumLength = length / 3;
    const entropyLength = bits.length - checksumLength;

    const entropyBits = bits.slice(0, entropyLength);
    const checksumBits = bits.slice(entropyLength);

    // Convert entropy bits to bytes
    const entropyBytes = Buffer.alloc(Math.ceil(entropyLength / 8));
    for (let i = 0; i < entropyBytes.length; i++) {
        entropyBytes[i] = parseInt(entropyBits.slice(i * 8, (i + 1) * 8), 2);
    }

    // SHA256 Hash of entropy
    const hash = createHash('sha256').update(entropyBytes).digest();

    // Convert hash to bits.
    // We convert enough bytes to cover the maximum checksum length (8 bits for 24 words).
    const hashBits = Array.from(hash).map(b => b.toString(2).padStart(8, '0')).join('');
    const calculatedChecksum = hashBits.slice(0, checksumLength);

    return checksumBits === calculatedChecksum;
}

/**
 * Checks if a single word is valid (exists in the wordlist).
 */
export function isWordValid(word: string, wordlist: string[] = DEFAULT_WORDLIST): boolean {
    return wordlist.includes(word);
}