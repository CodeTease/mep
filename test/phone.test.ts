import { PhonePrompt } from '../src/prompts/phone';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const sendKey = (key: string) => {
    process.stdin.emit('data', Buffer.from(key));
};

describe('PhonePrompt', () => {
    let stdoutSpy: jest.SpyInstance;

    beforeEach(() => {
        stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    });

    afterEach(() => {
        stdoutSpy.mockRestore();
    });

    it('should format input correctly for VN (default)', async () => {
        const prompt = new PhonePrompt({
            message: 'Phone',
            defaultCountry: 'VN' // +84, ### #### ###
        });

        const promise = prompt.run();
        await delay(10);

        // Input digits: 0901234567
        // Mask: ### #### ###
        // Expected: 090 1234 567
        // Result: +840901234567

        '0901234567'.split('').forEach(k => sendKey(k));
        await delay(10);
        sendKey('\r');

        const result = await promise;
        expect(result).toBe('+840901234567');
    });

    it('should handle switching sections and search', async () => {
        // Assume US is in the list
        const prompt = new PhonePrompt({
            message: 'Phone',
            defaultCountry: 'VN'
        });

        const promise = prompt.run();
        await delay(10);

        // Switch to Country section
        sendKey('\t');
        await delay(10);

        // Type 'US'
        sendKey('u');
        sendKey('s');
        await delay(20); // Search delay if any

        // Should switch to US (+1)
        // Switch back to number
        sendKey('\t');
        await delay(10);

        // Type number
        '2025550123'.split('').forEach(k => sendKey(k));
        await delay(10);
        sendKey('\r');

        const result = await promise;
        expect(result).toBe('+12025550123');
    });

    it('should validate strict length', async () => {
        const prompt = new PhonePrompt({
            message: 'Strict',
            defaultCountry: 'VN',
            strict: true
        });

        const promise = prompt.run();
        await delay(10);

        // Short input
        sendKey('1');
        sendKey('\r');

        // Should not resolve
        let resolved = false;
        promise.then(() => resolved = true);
        await delay(20);
        expect(resolved).toBe(false);

        // Fill remaining
        // VN mask: ### #### ### (10 digits)
        // typed 1, need 9 more
        '234567890'.split('').forEach(k => sendKey(k));
        await delay(10);
        sendKey('\r');

        const result = await promise;
        expect(result).toBe('+841234567890');
    });
});
