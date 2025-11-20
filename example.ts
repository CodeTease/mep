import { MepCLI } from './src'; // Or mep if installed via NPM

/**
 * Runs a comprehensive set of tests for all MepCLI prompt types.
 */
async function runAllTests() {
    console.clear();
    console.log("--- MepCLI Comprehensive Test Suite (Neutralized) ---\n");

    try {
        // --- 1. Text Prompt Test (with Validation) ---
        const projectName = await MepCLI.text({
            message: "Enter the name for your new project:",
            placeholder: "e.g., minimalist-cli-app",
            initial: "MepProject",
            validate: (value) => {
                if (value.length < 3) {
                    return "Project name must be at least 3 characters long.";
                }
                if (value.includes('&')) {
                    return "Project name cannot contain '&' symbol.";
                }
                return true;
            }
        });
        console.log(`\n✅ Text Result: Project name set to '${projectName}'`);

        // --- 2. Password Prompt Test ---
        const apiKey = await MepCLI.password({
            message: "Enter the project's external API key:",
            placeholder: "Input will be hidden..."
        });
        // Note: Do not log the actual key in a real app.
        console.log(`\n✅ Password Result: API key entered (length: ${apiKey.length})`);


        // --- 3. Select Prompt Test (Single Choice) ---
        const theme = await MepCLI.select({
            message: "Choose your preferred editor color theme:",
            choices: [
                { title: "Dark Mode (Default)", value: "dark" },
                { title: "Light Mode (Classic)", value: "light" },
                { title: "High Contrast (Accessibility)", value: "contrast" },
                { title: "Monokai Pro", value: "monokai" },
            ]
        });
        console.log(`\n✅ Select Result: Chosen theme is: ${theme}`);


        // --- 4. Checkbox Prompt Test (Multi-Choice with Min/Max) ---
        const buildTools = await MepCLI.checkbox({
            message: "Select your required bundlers/build tools (Min 1, Max 2):",
            min: 1, 
            max: 2, 
            choices: [
                { title: "Webpack", value: "webpack" },
                { title: "Vite", value: "vite", selected: true },
                { title: "Rollup", value: "rollup" },
                { title: "esbuild", value: "esbuild" }
            ]
        });
        console.log(`\n✅ Checkbox Result: Selected build tools: [${buildTools.join(', ')}]`);


        // --- 5. Confirm Prompt Test ---
        const proceed = await MepCLI.confirm({
            message: "Do you want to continue with the installation setup?",
            initial: true
        });
        console.log(`\n✅ Confirm Result: Setup decision: ${proceed ? 'Proceed' : 'Cancel'}`);

        console.log("\n--- All MepCLI tests completed successfully! ---");

    } catch (e) {
        if (e instanceof Error && e.message === 'User force closed') {
             console.log("\nOperation cancelled by user (Ctrl+C).");
        } else {
             console.error("\nAn error occurred during prompt execution:", e);
        }
    }
}

runAllTests();