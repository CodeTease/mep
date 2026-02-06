import { MepCLI } from '../src';

async function main() {
    console.clear();
    console.log("--- MepCLI Filesystem Prompts Demo ---\n");

    try {
        // 1. File Prompt
        const filePath = await MepCLI.file({
            message: "Select a file (Tab to autocomplete):",
            basePath: process.cwd(),
        });
        console.log(`Selected File: ${filePath}`);

        // 2. Tree Prompt
        const selectedNode = await MepCLI.tree({
            message: "Navigate the project structure:",
            data: [
                {
                    title: "src",
                    value: "src",
                    children: [
                        { title: "index.ts", value: "src/index.ts" },
                        { title: "utils.ts", value: "src/utils.ts" }
                    ]
                },
                {
                    title: "examples",
                    value: "examples",
                    children: [
                        { title: "basic-prompts.ts", value: "examples/basic-prompts.ts" },
                        { title: "selection-prompts.ts", value: "examples/selection-prompts.ts" }
                    ]
                },
                { title: "package.json", value: "package.json" }
            ]
        });
        console.log(`Tree Selection: ${selectedNode}`);

        // 3. Breadcrumb Prompt
        const breadcrumbPath = await MepCLI.breadcrumb({
            message: "Navigate directory (Breadcrumb):",
            root: process.cwd(),
            showHidden: false
        });
        console.log(`Breadcrumb Path: ${breadcrumbPath}`);

        // 4. Tree Select Prompt (Multi-select)
        const selectedFiles = await MepCLI.treeSelect({
            message: "Select files to include in build:",
            data: [
                {
                    title: "src",
                    value: "src",
                    children: [
                        { title: "index.ts", value: "src/index.ts", selected: true },
                        { title: "utils.ts", value: "src/utils.ts" }
                    ]
                },
                {
                    title: "tests",
                    value: "tests",
                    children: [
                        { title: "unit", value: "tests/unit" },
                        { title: "e2e", value: "tests/e2e" }
                    ]
                }
            ]
        });
        console.log(`Tree Select Result: [${selectedFiles.join(', ')}]`);

    } catch (e) {
        if (e instanceof Error && e.message === 'User force closed') {
            console.log("\nOperation cancelled by user.");
        } else {
            console.error("\nAn error occurred:", e);
        }
    }
}

main();
