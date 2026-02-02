// This example originally comes from example.ts (root)


import { MepCLI } from '../src';

async function main() {
    console.clear();
    console.log("--- MepCLI Calendar Prompt Demo ---\n");

    try {
        const bookingRange = await MepCLI.calendar({
            message: "Select booking period:",
            mode: "range"
        });
        console.log(`\n Calendar Result:`, bookingRange);
    } catch (e) {
        if (e instanceof Error && e.message === 'User force closed') {
             console.log("\nOperation cancelled by user.");
        } else {
             console.error("\nAn error occurred:", e);
        }
    }
}

main();
