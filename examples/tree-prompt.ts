// Originally from example.ts

import { MepCLI } from '../src'

try {
    const selectedFile = await MepCLI.tree({
        message: "Select a file from the project structure (Space to toggle, Enter to select):",
        data: [
            {
                title: "src",
                value: "src",
                children: [
                    { title: "index.ts", value: "src/index.ts" },
                    { title: "utils.ts", value: "src/utils.ts" },
                    {
                        title: "prompts",
                        value: "src/prompts",
                        expanded: true,
                        children: [
                            { title: "text.ts", value: "src/prompts/text.ts" },
                            { title: "select.ts", value: "src/prompts/select.ts" }
                        ]
                    }
                ]
            },
            {
                title: "package.json",
                value: "package.json"
            },
            {
                title: "README.md",
                value: "README.md"
            }
        ]
    });
    console.log(`\n Tree Result: Selected path: ${selectedFile}`);
} catch (e) {
    if (e instanceof Error && e.message === 'User force closed') {
        console.log("\nOperation cancelled by user.");
    } else {
        console.error("\nAn error occurred:", e);
    }
}