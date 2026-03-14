import { MepCLI } from '../src/core';
import { Prompt } from '../src/base';
import { BaseOptions } from '../src/types';

// --- Mock Prompt Classes ---

interface CountdownOptions extends BaseOptions {
    from: number;
}

class CountdownPrompt extends Prompt<number, CountdownOptions> {
    protected render(): void {
        this.submit(this.options.from - 1);
    }
    protected handleInput(): void { }
}

class AltCountdownPrompt extends Prompt<number, CountdownOptions> {
    protected render(): void {
        this.submit(this.options.from * 2);
    }
    protected handleInput(): void { }
}

// Module augmentation for test types
declare module '../src/types' {
    interface ExtensionRegistry {
        countdown: { options: CountdownOptions; result: number };
    }
}

// --- Tests ---



describe('Extension Registry', () => {
    let stdoutSpy: jest.SpyInstance;

    beforeEach(() => {
        stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
        // Reset internal registry between tests
        (MepCLI as any).registry = new Map();
    });

    afterEach(() => {
        stdoutSpy.mockRestore();
    });

    describe('MepCLI.register', () => {
        it('should register a new prompt type', () => {
            MepCLI.register('countdown', CountdownPrompt);
            expect((MepCLI as any).registry.has('countdown')).toBe(true);
        });

        it('should warn on duplicate registration', () => {
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });

            MepCLI.register('countdown', CountdownPrompt);
            MepCLI.register('countdown', AltCountdownPrompt);

            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining('"countdown" is already registered')
            );
            warnSpy.mockRestore();
        });

        it('should overwrite the existing entry after warning', () => {
            jest.spyOn(console, 'warn').mockImplementation(() => { });

            MepCLI.register('countdown', CountdownPrompt);
            MepCLI.register('countdown', AltCountdownPrompt);

            expect((MepCLI as any).registry.get('countdown')).toBe(AltCountdownPrompt);
            jest.restoreAllMocks();
        });
    });

    describe('MepCLI.prompt', () => {
        it('should instantiate and run a registered prompt', async () => {
            MepCLI.register('countdown', CountdownPrompt);

            const result = await MepCLI.prompt({
                type: 'countdown',
                message: 'Countdown',
                from: 10
            });

            expect(result).toBe(9);
        });

        it('should throw for an unregistered type', async () => {
            await expect(
                (async () => {
                    await MepCLI.prompt({ type: 'countdown', message: 'Test', from: 1 });
                })()
            ).rejects.toThrow('Prompt type "countdown" is not registered.');
        });

        it('should use the latest registered class after overwrite', async () => {
            jest.spyOn(console, 'warn').mockImplementation(() => { });

            MepCLI.register('countdown', CountdownPrompt);
            MepCLI.register('countdown', AltCountdownPrompt);

            const result = await MepCLI.prompt({
                type: 'countdown',
                message: 'Alt Countdown',
                from: 5
            });

            expect(result).toBe(10); // AltCountdownPrompt returns from * 2
            jest.restoreAllMocks();
        });
    });
});
