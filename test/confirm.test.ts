import { ConfirmPrompt } from '../src/prompts/confirm';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const sendKey = (key: string) => {
    process.stdin.emit('data', Buffer.from(key));
};

describe('ConfirmPrompt', () => {
    let stdoutSpy: jest.SpyInstance;

    beforeEach(() => {
        stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    });

    afterEach(() => {
        stdoutSpy.mockRestore();
    });

    it('should resolve with default true', async () => {
        const prompt = new ConfirmPrompt({
            message: 'Are you sure?'
            // initial defaults to true
        });

        const promise = prompt.run();
        await delay(10);

        sendKey('\r');
        const result = await promise;
        expect(result).toBe(true);
    });

    it('should resolve with provided initial value', async () => {
        const prompt = new ConfirmPrompt({
            message: 'Are you sure?',
            initial: false
        });

        const promise = prompt.run();
        await delay(10);

        sendKey('\r');
        const result = await promise;
        expect(result).toBe(false);
    });

    it('should change to false on "n"', async () => {
        const prompt = new ConfirmPrompt({
            message: 'Are you sure?', // initial true
        });

        const promise = prompt.run();
        await delay(10);

        sendKey('n');
        await delay(10);

        sendKey('\r');
        const result = await promise;
        expect(result).toBe(false);
    });

    it('should change to true on "y"', async () => {
        const prompt = new ConfirmPrompt({
            message: 'Are you sure?',
            initial: false
        });

        const promise = prompt.run();
        await delay(10);

        sendKey('y');
        await delay(10);

        sendKey('\r');
        const result = await promise;
        expect(result).toBe(true);
    });

    it('should toggle on right arrow key', async () => {
        const prompt = new ConfirmPrompt({
            message: 'Are you sure?',
            initial: false
        });

        const promise = prompt.run();
        await delay(10);

        sendKey('\x1b[C'); // Right arrow
        await delay(10);

        sendKey('\r');
        const result = await promise;
        expect(result).toBe(true);
    });

    it('should toggle on left arrow key', async () => {
        const prompt = new ConfirmPrompt({
            message: 'Are you sure?',
            initial: true
        });

        const promise = prompt.run();
        await delay(10);

        sendKey('\x1b[D'); // Left arrow
        await delay(10);

        sendKey('\r');
        const result = await promise;
        expect(result).toBe(false);
    });
});
