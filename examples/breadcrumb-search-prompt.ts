import { MepCLI } from '../src';

async function main() {
    console.clear();
    console.log("--- Breadcrumb Search Prompt Example ---\n");
    console.log("Instructions: Use Arrows to navigate folders.");
    console.log("Start typing to switch to Search Mode (filters files in current folder).");
    console.log("Press Enter on a folder result to drill down, or on a file to select.\n");

    try {
        const path = await MepCLI.breadcrumbSearch({
            message: "Navigate and Search Project Files:",
            root: process.cwd(),
            showHidden: false
        });

        console.log(`\nSelected Path: ${path}`);
    } catch (_error) {
        console.log("\nCancelled.");
    }
}

main();
