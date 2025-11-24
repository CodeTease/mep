import { MepCLI } from './src'; // Or 'mepcli' if installed via NPM

/**
 * Runs a comprehensive demo showcasing all MepCLI prompt types and utilities.
 * This demonstrates all core functionalities including Text, Password, Select,
 * Checkbox, Number, Toggle, Confirm, and the Spin utility.
 */
async function runComprehensiveDemo() {
    console.clear();
    console.log("--- MepCLI Comprehensive Demo (All 7 Prompts + Spin Utility) ---\n");

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
        console.log(`\n✅ Text Result: Project name set to '${projectName}'`);

        // --- 2. Password Prompt (Hidden input) ---
        const apiKey = await MepCLI.password({
            message: "Enter the project's external API key:",
            placeholder: "Input will be hidden..."
        });
        console.log(`\n✅ Password Result: API key entered (length: ${apiKey.length})`);

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
        console.log(`\n✅ Select Result: Chosen theme is: ${theme}`);

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
        console.log(`\n✅ Checkbox Result: Selected build tools: [${buildTools.join(', ')}]`);

        // --- 5. Number Prompt (Numeric input, supports Min/Max and Up/Down arrow for Step) ---
        const port = await MepCLI.number({
            message: "Which port should the server run on?",
            initial: 3000,
            min: 1024,
            max: 65535,
            step: 100 // Increments/decrements by 100 with arrows
        });
        console.log(`\n✅ Number Result: Server port: ${port}`);
        
        // --- 6. Toggle Prompt (Boolean input, supports custom labels) ---
        const isSecure = await MepCLI.toggle({
            message: "Enable HTTPS/SSL for production?",
            initial: false,
            activeText: "SECURE", // Custom 'on' label
            inactiveText: "INSECURE" // Custom 'off' label
        });
        console.log(`\n✅ Toggle Result: HTTPS enabled: ${isSecure}`);

        // --- 7. Confirm Prompt (Simple Yes/No) ---
        const proceed = await MepCLI.confirm({
            message: "Ready to deploy the project now?",
            initial: true
        });
        console.log(`\n✅ Confirm Result: Deployment decision: ${proceed ? 'Proceed' : 'Cancel'}`);

        // --- 8. Spin Utility (Loading/Async Task Indicator) ---
        await MepCLI.spin(
            "Finalizing configuration and deploying to Teaserverse...",
            new Promise(resolve => setTimeout(resolve, 1500)) // Simulates a 1.5 second async task
        );
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
