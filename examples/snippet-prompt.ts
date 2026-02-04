// Orginally from example.ts

import { MepCLI } from "../src"

try {
    const commitMsg = await MepCLI.snippet({
        message: "Compose Commit Message (Tab/Shift+Tab to navigate variables):",
        template: "feat(${scope}): ${message} (Refs: #${issue})",
        values: {
            scope: "cli",
            issue: "123"
        }
    });
    console.log(`\n Snippet Result: "${commitMsg}"`);
    
} catch (e) {
    if (e instanceof Error && e.message === 'User force closed') {
         console.log("\nOperation cancelled by user.");
    } else {
         console.error("\nAn error occurred:", e);
    }
}