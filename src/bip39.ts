import { createHash } from 'crypto';
import { WORDLIST_ENGLISH } from './assets/bip39_wordlists';

// Default to English if no wordlist is provided
export const DEFAULT_WORDLIST = WORDLIST_ENGLISH;

/**
 * Validates a mnemonic phrase against a wordlist and checksum.
 * Supports flexible lengths: 12, 15, 18, 21, 24 words.
 */
export function validateMnemonic(words: string[], wordlist: readonly string[] = DEFAULT_WORDLIST): boolean {
    const length = words.length;
    // Allowed lengths: 12, 15, 18, 21, 24
    if (![12, 15, 18, 21, 24].includes(length)) {
        return false;
    }

    // Check if all words are in the wordlist
    const indices = words.map(w => wordlist.indexOf(w));
    if (indices.some(i => i === -1)) {
        return false;
    }

    // Convert indices to 11-bit binary strings
    const bits = indices.map(i => i.toString(2).padStart(11, '0')).join('');

    // Calculate checksum length: Total bits / 33
    const checksumLength = bits.length / 33;
    const entropyBits = bits.slice(0, -checksumLength);
    const checksumBits = bits.slice(-checksumLength);

    // Convert entropy bits to buffer
    const entropyBytes = Buffer.alloc(entropyBits.length / 8);
    for (let i = 0; i < entropyBytes.length; i++) {
        entropyBytes[i] = parseInt(entropyBits.slice(i * 8, (i + 1) * 8), 2);
    }

    // Calculate SHA256 checksum of entropy
    const hash = createHash('sha256').update(entropyBytes).digest();
    
    // Convert first byte of hash to binary string to compare checksum
    // Note: We need enough bits from the hash. 
    // 12 words = 4 bits checksum, 24 words = 8 bits checksum.
    // Reading the first byte (8 bits) is usually enough for up to 24 words.
    const hashBits = hash[0].toString(2).padStart(8, '0');
    
    return checksumBits === hashBits.slice(0, checksumLength);
}

/**
 * Checks if a single word exists in the provided wordlist.
 */
export function isWordValid(word: string, wordlist: readonly string[] = DEFAULT_WORDLIST): boolean {
    return wordlist.includes(word);
}