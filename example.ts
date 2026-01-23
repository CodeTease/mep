import { MepCLI } from './src'; // Or 'mepcli' if installed via NPM

/**
 * Runs a comprehensive demo showcasing all MepCLI prompt types and utilities.
 * This demonstrates all core functionalities including Text, Password, Select,
 * Checkbox, Number, Toggle, Confirm, List, Slider, Date, File, MultiSelect,
 * Autocomplete, Sort, Table, and the Spin utility.
 */
async function runComprehensiveDemo() {
    console.clear();
    console.log("--- MepCLI Comprehensive Demo (All 15 Prompts + Spin Utility) ---\n");

    try {
        // --- 1. Text Prompt (Input with Validation and initial value) ---
        const projectName = await MepCLI.text({
            message: "Enter the name for your new project:",
            placeholder: "e.g., minimalist-cli-app",
            initial: "MepProject",
            validate: (value) => {
                if (value.length < 3) return "Project name must be at least 3 characters long.";
                return true;
            }
        });
        console.log(`\n Text Result: Project name set to '${projectName}'`);

        // --- 2. Password Prompt (Hidden input) ---
        const apiKey = await MepCLI.password({
            message: "Enter the project's external API key:",
            placeholder: "Input will be hidden..."
        });
        console.log(`\n Password Result: API key entered (length: ${apiKey.length})`);

        // --- 3. Select Prompt (Single choice, supports filtering/searching by typing) ---
        const theme = await MepCLI.select({
            message: "Choose your preferred editor color theme:",
            choices: [
                { title: "Dark Mode (Default)", value: "dark" },
                { title: "Light Mode (Classic)", value: "light" },
                { title: "High Contrast (Accessibility)", value: "contrast" },
                // Demonstrates a separator option
                { separator: true, text: "--- Pro Themes ---" },
                { title: "Monokai Pro", value: "monokai" },
            ]
        });
        console.log(`\n Select Result: Chosen theme is: ${theme}`);

        // --- 4. Checkbox Prompt (Multi-choice with Min/Max limits) ---
        const buildTools = await MepCLI.checkbox({
            message: "Select your required bundlers/build tools (Min 1, Max 2):",
            min: 1, 
            max: 2, 
            choices: [
                { title: "Webpack", value: "webpack" },
                { title: "Vite", value: "vite", selected: true }, // Default selected state
                { title: "Rollup", value: "rollup" },
                { title: "esbuild", value: "esbuild" }
            ]
        });
        console.log(`\n Checkbox Result: Selected build tools: [${buildTools.join(', ')}]`);

        // --- 5. Number Prompt (Numeric input, supports Min/Max and Up/Down arrow for Step) ---
        const port = await MepCLI.number({
            message: "Which port should the server run on?",
            initial: 3000,
            min: 1024,
            max: 65535,
            step: 100 // Increments/decrements by 100 with arrows
        });
        console.log(`\n Number Result: Server port: ${port}`);
        
        // --- 6. Toggle Prompt (Boolean input, supports custom labels) ---
        const isSecure = await MepCLI.toggle({
            message: "Enable HTTPS/SSL for production?",
            initial: false,
            activeText: "SECURE", // Custom 'on' label
            inactiveText: "INSECURE" // Custom 'off' label
        });
        console.log(`\n Toggle Result: HTTPS enabled: ${isSecure}`);

        // --- 7. List / Tags Input (New) ---
        const keywords = await MepCLI.list({
            message: "Enter keywords for package.json (Enter to add, Backspace to remove):",
            initial: ["cli", "mep"],
            validate: (tags) => tags.length > 0 || "Please add at least one keyword."
        });
        console.log(`\n List Result: Keywords: [${keywords.join(', ')}]`);

        // --- 8. Slider / Scale (New) ---
        const brightness = await MepCLI.slider({
            message: "Set initial brightness:",
            min: 0,
            max: 100,
            initial: 80,
            step: 5,
            unit: "%"
        });
        console.log(`\n Slider Result: Brightness: ${brightness}%`);

        // --- 9. Rating Prompt (New) ---
        const userRating = await MepCLI.rating({
            message: "How would you rate this CLI tool?",
            min: 1,
            max: 5,
            initial: 5
        });
        console.log(`\n Rating Result: You rated it: ${userRating}/5`);

        // --- 10. Date / Time Picker (New) ---
        // We capture 'now' once to ensure initial >= min
        const now = new Date();
        const releaseDate = await MepCLI.date({
            message: "Schedule release date:",
            initial: now,
            min: now // Cannot be in the past
        });
        console.log(`\n Date Result: Release set for: ${releaseDate.toLocaleString()}`);

        // --- 11. File Path Selector (New) ---
        const configPath = await MepCLI.file({
            message: "Select configuration file (Tab to autocomplete):",
            basePath: process.cwd()
        });
        console.log(`\n File Result: Path: ${configPath}`);

        // --- 12. Multi-Select Autocomplete (New) ---
        const linters = await MepCLI.multiSelect({
            message: "Select linters to install (Type to search, Space to select):",
            choices: [
                { title: "ESLint", value: "eslint", selected: true },
                { title: "Prettier", value: "prettier" },
                { title: "Stylelint", value: "stylelint" },
                { title: "TSLint (Deprecated)", value: "tslint" },
                { title: "JSHint", value: "jshint" },
                { title: "StandardJS", value: "standard" }
            ],
            min: 1
        });
        console.log(`\n MultiSelect Result: Linters: [${linters.join(', ')}]`);

        // --- 13. Autocomplete Prompt (New) ---
        const city = await MepCLI.autocomplete({
            message: "Search for a city (simulated async):",
            suggest: async (query) => {
                const cities = [
                    { title: "New York", value: "NY" },
                    { title: "London", value: "LDN" },
                    { title: "Paris", value: "PAR" },
                    { title: "Tokyo", value: "TKY" },
                    { title: "Berlin", value: "BER" },
                    { title: "San Francisco", value: "SF" },
                    { title: "Toronto", value: "TOR" }
                ];
                // Simulate delay
                await new Promise(r => setTimeout(r, 400));
                return cities.filter(c => c.title.toLowerCase().includes(query.toLowerCase()));
            }
        });
        console.log(`\n Autocomplete Result: City code: ${city}`);

        // --- 14. Sort Prompt (New) ---
        const priorities = await MepCLI.sort({
            message: "Rank your top priorities (Space to grab/drop, Arrows to move):",
            items: ["Performance", "Security", "Features", "Usability", "Cost"]
        });
        console.log(`\n Sort Result: Priorities: [${priorities.join(', ')}]`);

        // --- 15. Table Prompt (New) ---
        const userId = await MepCLI.table({
            message: "Select a user from the database:",
            columns: ["ID", "Name", "Role", "Status"],
            data: [
                { value: 1, row: ["001", "Alice", "Admin", "Active"] },
                { value: 2, row: ["002", "Bob", "Dev", "Offline"] },
                { value: 3, row: ["003", "Charlie", "User", "Active"] },
                { value: 4, row: ["004", "David", "Manager", "Active"] },
            ]
        });
        console.log(`\n Table Result: Selected User ID: ${userId}`);

        // --- 16. Confirm Prompt (Simple Yes/No) ---
        const proceed = await MepCLI.confirm({
            message: "Ready to deploy the project now?",
            initial: true
        });
        console.log(`\n Confirm Result: Deployment decision: ${proceed ? 'Proceed' : 'Cancel'}`);

        // --- 17. Spin Utility (Loading/Async Task Indicator) ---
        const s = MepCLI.spinner("Finalizing configuration and deploying...").start();
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulates a 1.5 second async task
        s.success();
        
        console.log("\n--- Deployment successful! All MepCLI features demonstrated! ---");

    } catch (e) {
        // Global handler for Ctrl+C closure
        if (e instanceof Error && e.message === 'User force closed') {
             console.log("\nOperation cancelled by user (Ctrl+C).");
        } else {
             console.error("\nAn error occurred during prompt execution:", e);
        }
    }
}

runComprehensiveDemo();
