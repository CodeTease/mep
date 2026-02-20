import { TextPrompt } from '../src/prompts/text';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const sendKey = (key: string) => {
    process.stdin.emit('data', Buffer.from(key));
};

describe('TextPrompt', () => {
    let stdoutSpy: jest.SpyInstance;

    beforeEach(() => {
        stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    });

    afterEach(() => {
        stdoutSpy.mockRestore();
    });

    it('should resolve with default empty string', async () => {
        const prompt = new TextPrompt({
            message: 'Name?'
        });

        const promise = prompt.run();
        await delay(10);

        sendKey('\r');
        const result = await promise;
        expect(result).toBe('');
    });

    it('should resolve with provided initial value', async () => {
        const prompt = new TextPrompt({
            message: 'Name?',
            initial: 'Admin'
        });

        const promise = prompt.run();
        await delay(10);

        sendKey('\r');
        const result = await promise;
        expect(result).toBe('Admin');
    });

    it('should capture typed text', async () => {
        const prompt = new TextPrompt({
            message: 'Name?'
        });

        const promise = prompt.run();
        await delay(10);

        sendKey('O');
        sendKey('k');
        await delay(10);

        sendKey('\r');
        const result = await promise;
        expect(result).toBe('Ok');
    });

    it('should handle backspace', async () => {
        const prompt = new TextPrompt({
            message: 'Name?'
        });

        const promise = prompt.run();
        await delay(10);

        sendKey('A');
        sendKey('b');
        sendKey('\x7f'); // Backspace
        sendKey('c');
        await delay(10);

        sendKey('\r');
        const result = await promise;
        expect(result).toBe('Ac'); // "Ab" -> "A" -> "Ac"
    });

    it('should handle left and right arrows', async () => {
        const prompt = new TextPrompt({
            message: 'Name?'
        });

        const promise = prompt.run();
        await delay(10);

        sendKey('a');
        sendKey('c');
        // move left
        sendKey('\x1b[D');
        // insert b
        sendKey('b');
        await delay(10);

        sendKey('\r');
        const result = await promise;
        expect(result).toBe('abc');
    });

    it('should validate input', async () => {
        const prompt = new TextPrompt({
            message: 'Name?',
            validate: (val) => val.length > 2 ? true : 'Too short'
        });

        const promise = prompt.run();
        await delay(10);

        sendKey('H');
        sendKey('i');
        await delay(10);
        sendKey('\r'); // Fails validation

        await delay(10);

        sendKey('!');
        await delay(10);
        sendKey('\r'); // Passes validation

        const result = await promise;
        expect(result).toBe('Hi!');
    });
});
