import { CalculatorPrompt } from '../src/prompts/calculator';
import { CronPrompt } from '../src/prompts/cron';
import { TreePrompt } from '../src/prompts/tree';
import { TreeSelectPrompt } from '../src/prompts/tree-select';
import { SpreadsheetPrompt } from '../src/prompts/spreadsheet';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const sendKey = (key: string) => {
    process.stdin.emit('data', Buffer.from(key));
};

describe('Complex Prompts', () => {
    let stdoutSpy: jest.SpyInstance;

    beforeEach(() => {
        stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    });

    afterEach(() => {
        stdoutSpy.mockRestore();
    });

    describe('CalculatorPrompt', () => {
        it('should evaluate simple expressions', async () => {
            const prompt = new CalculatorPrompt({
                message: 'Calc'
            });

            const promise = prompt.run();
            await delay(10);

            sendKey('2');
            sendKey('+');
            sendKey('2');
            await delay(10);
            
            sendKey('\r');
            
            const result = await promise;
            expect(result).toBe(4);
        });

        it('should handle variables', async () => {
            const prompt = new CalculatorPrompt({
                message: 'Calc',
                variables: { x: 10 }
            });

            const promise = prompt.run();
            await delay(10);

            sendKey('x');
            sendKey('*');
            sendKey('2');
            await delay(10);

            sendKey('\r');

            const result = await promise;
            expect(result).toBe(20);
        });

        it('should handle invalid input gracefully', async () => {
             const prompt = new CalculatorPrompt({
                 message: 'Calc'
             });
 
             const promise = prompt.run();
             await delay(10);
 
             sendKey('a'); 
             
             await delay(10);
             sendKey('\r');

             // It should not resolve yet because of error
             let resolved = false;
             promise.then(() => { resolved = true; });
             
             await delay(10);
             expect(resolved).toBe(false);

             // Fix input: Backspace then 1
             sendKey('\x7f');
             sendKey('1');
             await delay(10);
             sendKey('\r');
             
             const result = await promise;
             expect(result).toBe(1);
        });
    });

    describe('CronPrompt', () => {
        it('should submit valid cron string', async () => {
            const prompt = new CronPrompt({
                message: 'Cron',
                initial: '0 0 * * *'
            });

            const promise = prompt.run();
            await delay(10);

            // Minute is 0. Type 5.
            sendKey('5');
            await delay(10);

            sendKey('\r');
            
            const result = await promise;
            // 5 becomes 5. "5 0 * * *"
            expect(result).toBe('5 0 * * *');
        });

        it('should navigate and change fields', async () => {
            const prompt = new CronPrompt({
                message: 'Cron',
                initial: '0 0 * * *'
            });

            const promise = prompt.run();
            await delay(10);

            // Minute is 0. Arrow Up -> 1
            sendKey('\u001b[A'); // Up
            await delay(10);

            // Tab to Hour
            sendKey('\t');
            await delay(10);

            // Hour is 0. Arrow Up -> 1
            sendKey('\u001b[A'); 
            await delay(10);
            
            sendKey('\r');
            const result = await promise;
            expect(result).toBe('1 1 * * *');
        });
    });

    describe('TreePrompt', () => {
        it('should select a leaf node', async () => {
            const data = [
                { title: 'A', value: 'a' },
                { title: 'B', value: 'b', children: [
                    { title: 'B1', value: 'b1' }
                ]}
            ];
            const prompt = new TreePrompt({
                message: 'Tree',
                data
            });

            const promise = prompt.run();
            await delay(10);

            // Cursor on A. Down -> B
            sendKey('\u001b[B');
            await delay(10);

            // Right -> Expand B
            sendKey('\u001b[C');
            await delay(10);
            
            // Right -> Move to B1
            sendKey('\u001b[C'); 
            await delay(10);
            
            sendKey('\r');
            const result = await promise;
            expect(result).toBe('b1');
        });
    });

    describe('TreeSelectPrompt', () => {
        it('should select multiple nodes', async () => {
            const data = [
                { title: 'A', value: 'a' },
                { title: 'B', value: 'b' }
            ];
            const prompt = new TreeSelectPrompt({
                message: 'TreeSelect',
                data
            });

            const promise = prompt.run();
            await delay(10);

            // Select A
            sendKey(' ');
            await delay(10);

            // Move to B
            sendKey('\u001b[B');
            await delay(10);

            // Select B
            sendKey(' ');
            await delay(10);

            sendKey('\r');
            const result = await promise;
            expect(result).toEqual(['a', 'b']);
        });

         it('should select children when parent is selected', async () => {
            const data = [
                { title: 'P', value: 'p', children: [
                    { title: 'C', value: 'c' }
                ]}
            ];
            const prompt = new TreeSelectPrompt({
                message: 'TreeSelect',
                data
            });

            const promise = prompt.run();
            await delay(10);

            // Select P (auto selects C)
            sendKey(' ');
            await delay(10);

            sendKey('\r');
            const result = await promise;
            expect(result).toEqual(['p', 'c']);
        });
    });

    describe('SpreadsheetPrompt', () => {
        it('should edit cell value', async () => {
             const prompt = new SpreadsheetPrompt({
                 message: 'Sheet',
                 columns: [
                     { name: 'Name', key: 'name', width: 10 },
                     { name: 'Age', key: 'age', width: 5 }
                 ],
                 data: [
                     { name: 'John', age: 30 }
                 ]
             });

             const promise = prompt.run();
             await delay(10);

             // Cursor at (0,0) -> Name.
             // Enter edit mode
             sendKey('\r');
             await delay(10);

             // Backspace x 4 to clear 'John'
             sendKey('\x7f'); sendKey('\x7f'); sendKey('\x7f'); sendKey('\x7f'); 
             
             sendKey('D'); sendKey('o'); sendKey('e');
             await delay(10);

             // Enter to save
             sendKey('\r');
             await delay(10);

             // Save global
             sendKey('s');

             const result = await promise;
             expect(result[0].name).toBe('Doe');
        });
    });
});
