import { MepCLI } from '../src';

async function main() {
    console.clear();
    console.log("--- MepCLI Selection Prompts Demo ---\n");

    try {
        // 1. Select Prompt
        const language = await MepCLI.select({
            message: "Choose your programming language:",
            choices: [
                { title: "TypeScript", value: "ts" },
                { title: "JavaScript", value: "js" },
                { title: "Python", value: "py" },
                { title: "Go", value: "go" },
                { title: "Rust", value: "rust" }
            ]
        });
        console.log(`Language: ${language}`);

        // 2. MultiSelect Prompt
        const frameworks = await MepCLI.multiSelect({
            message: "Select frameworks (Space to select, Enter to submit):",
            choices: [
                { title: "React", value: "react", selected: true },
                { title: "Vue", value: "vue" },
                { title: "Angular", value: "angular" },
                { title: "Svelte", value: "svelte" },
                { title: "Next.js", value: "next" }
            ],
            min: 1
        });
        console.log(`Frameworks: [${frameworks.join(', ')}]`);

        // 3. Checkbox Prompt
        const features = await MepCLI.checkbox({
            message: "Select features to enable:",
            choices: [
                { title: "Linter", value: "lint" },
                { title: "Formatter", value: "format" },
                { title: "Unit Tests", value: "test" },
                { title: "E2E Tests", value: "e2e" }
            ]
        });
        console.log(`Features: [${features.join(', ')}]`);

        // 4. Autocomplete Prompt
        const country = await MepCLI.autocomplete({
            message: "Select a country (Type to filter):",
            suggest: async (input) => {
                const countries = ["USA", "Canada", "UK", "Germany", "France", "Japan", "China", "India", "Brazil", "Australia"];
                return countries
                    .filter(c => c.toLowerCase().includes(input.toLowerCase()))
                    .map(c => ({ title: c, value: c }));
            }
        });
        console.log(`Country: ${country}`);

        // 5. Fuzzy Select Prompt
        const command = await MepCLI.fuzzySelect({
            message: "Run a command (Fuzzy match):",
            choices: [
                { title: "npm install", value: "install" },
                { title: "npm start", value: "start" },
                { title: "npm test", value: "test" },
                { title: "npm run build", value: "build" },
                { title: "npm run lint", value: "lint" }
            ]
        });
        console.log(`Command: ${command}`);

    } catch (e) {
        if (e instanceof Error && e.message === 'User force closed') {
             console.log("\nOperation cancelled by user.");
        } else {
             console.error("\nAn error occurred:", e);
        }
    }
}

main();
