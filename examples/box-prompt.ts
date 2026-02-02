import { MepCLI } from '../src';

async function runBoxDemo() {
    console.clear();
    console.log("--- MepCLI Box Prompt Demo ---\n");
    console.log('Instructions: Use Arrows to navigate. Type numbers to edit value. + / - to increment/decrement.');

    try {
        const box = await MepCLI.box({
            message: 'Set Box Model (Margin):',
            initial: 10,
            step: 5,
            min: 0,
            max: 100
        });
        console.log(`\nResult Box:`, box);
    } catch (e) {
        if (e instanceof Error && e.message === 'User force closed') {
            console.log("\nOperation cancelled by user.");
       } else {
            console.error("\nError:", e);
       }
    }
}

runBoxDemo();
