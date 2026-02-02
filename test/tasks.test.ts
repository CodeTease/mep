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
        // Since we are mocking process.stdout.write, we can check if it receives the buffered log at the end
        // BUT console.log itself writes to stdout. 
        // When we hijack, we replace console.log. 
        // So calling console.log shouldn't trigger writeSpy (which is on stdout.write).
        
        tasks.run();
        
        console.log('Buffered Log');
        
        // Ideally, console.log calls stdout.write. But since we replaced console.log with our own function 
        // that pushes to array, writeSpy (on stdout.write) should NOT be called.
        // HOWEVER, Jest also mocks console.log sometimes? 
        // We need to be careful. Jest environment usually captures console.log.
        // But our code explicitly assigns `console.log = ...`.
        
        tasks.stop();
        
        // After stop, we flush buffer using stdout.write.
        expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('Buffered Log'));
    });
});
