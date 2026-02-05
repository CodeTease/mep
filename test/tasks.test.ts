import { MepCLI } from '../src/core';
import { TaskRunner } from '../src/tasks';
import { ANSI } from '../src/ansi';

describe('TaskRunner', () => {
    let writeSpy: jest.SpyInstance;

    beforeEach(() => {
        writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
        jest.useFakeTimers();
    });

    afterEach(() => {
        writeSpy.mockRestore();
        jest.useRealTimers();
    });

    test('should initialize and run', () => {
        const tasks = new TaskRunner();
        tasks.add('t1', { title: 'Task 1' });

        tasks.run();
        expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining(ANSI.HIDE_CURSOR));

        tasks.stop();
        expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining(ANSI.SHOW_CURSOR));
    });

    test('should update tasks', () => {
        const tasks = new TaskRunner();
        tasks.add('t1', { title: 'Initial' });

        tasks.update('t1', { title: 'Updated' });

        // We can't easily inspect internal state without violating privacy, 
        // but we can verify no errors are thrown.
        expect(() => tasks.run()).not.toThrow();
        tasks.stop();
    });

    test('public API via MepCLI', () => {
        const tasks = MepCLI.tasks();
        expect(tasks).toBeInstanceOf(TaskRunner);
    });

    test('should hijack console logs', () => {
        const tasks = new TaskRunner();

        tasks.run();
        console.log('Buffered Log');
        tasks.stop();

        // After stop, we flush buffer using stdout.write.
        expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('Buffered Log'));
    });
});
