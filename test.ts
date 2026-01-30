import { MepCLI } from './src/index';

/**
 * Cleanup Logic Stress Test
 * * This script runs an infinite loop of random, simple prompts.
 * Purpose: Verify that event listeners and raw mode settings are 
 * correctly cleaned up between prompt instances.
 * * If cleanup fails, you might observe:
 * 1. Double character inputs.
 * 2. Node.js warning about too many event listeners (MaxListenersExceededWarning).
 * 3. Crashes due to undefined references in previous prompt instances.
 */

// Define a type for our testable prompt generators
type PromptGenerator = () => Promise<any>;

// Collection of "Low Friction" prompts for rapid testing
const generators: PromptGenerator[] = [
    // 1. Text Prompt: Just hit Enter
    () => MepCLI.text({
        message: 'Random Text Check (Press Enter)',
        initial: 'default value',
    }),

    // 2. Confirm Prompt: Just hit Enter (defaults to Yes)
    () => MepCLI.confirm({
        message: 'Cleanup check passed?',
        initial: true
    }),

    // 3. Toggle Prompt: Space or Enter
    () => MepCLI.toggle({
        message: 'Toggle state check',
        activeText: 'Clean',
        inactiveText: 'Dirty'
    }),

    // 4. Number Prompt: Enter or Up/Down
    () => MepCLI.number({
        message: 'Enter a number',
        initial: 42
    }),

    // 5. Select Prompt: Enter or Up/Down
    () => MepCLI.select({
        message: 'Pick a random option',
        choices: [
            { title: 'Option A', value: 'a' },
            { title: 'Option B', value: 'b' },
            { title: 'Option C', value: 'c' }
        ]
    })
];

/**
 * Picks a random element from an array.
 */
function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Main Test Loop
 */
async function runInfiniteTest() {
    console.clear();
    console.log('\x1b[36m%s\x1b[0m', 'Starting Infinite Cleanup Test...');
    console.log('Press Ctrl+C to stop.\n');

    let count = 1;

    // Infinite loop
    while (true) {
        console.log(`\x1b[90m[Iteration #${count}]\x1b[0m`);
        
        const generatePrompt = pickRandom(generators);
        
        try {
            // Run the prompt
            const result = await generatePrompt();
            
            // Log result briefly (optional, just to show flow continued)
            // console.log(`Result: ${JSON.stringify(result)}`);
            
        } catch (error) {
            console.error('\x1b[31mTest Failed / Crashed:\x1b[0m', error);
            process.exit(1);
        }

        count++;
        // Small delay isn't strictly necessary but makes the log readable 
        // and gives the terminal a split second to flush if needed.
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

// Start the chaos
runInfiniteTest().catch(console.error);