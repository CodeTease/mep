import { MepCLI } from '../src';

async function main() {
    console.clear();
    console.log("--- Multi-Range Prompt Example ---\n");
    console.log("Instructions: Move to start, press SPACE to anchor. Move to end, press SPACE to commit range.");
    console.log("You can repeat this to select multiple discontinuous ranges.\n");

    try {
        const selectedValues = await MepCLI.multiRange({
            message: "Select multiple ranges of commits to cherry-pick:",
            choices: Array.from({ length: 20 }, (_, i) => ({
                title: `Commit #${i + 100} (Feature ${String.fromCharCode(65 + (i % 5))})`,
                value: `c${i + 100}`
            }))
        });

        console.log(`\nSelected Commits: [${selectedValues.join(', ')}]`);
    } catch (_error) {
        console.log("\nCancelled.");
    }
}

main();
