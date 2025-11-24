import { MepCLI } from './src'

async function setup() {
    // Text input with validation and cursor support
    const projectName = await MepCLI.text({
        message: "Enter the project name:",
        validate: (v) => v.length > 5 || "Must be longer than 5 chars",
    });

    // Select menu
    const choice = await MepCLI.select({
        message: "Choose an option:",
        choices: [
            { title: "Option A", value: 1 },
            { title: "Option B", value: 2 }
        ]
    });

    console.log(`\nProject: ${projectName}, Selected: ${choice}`);
}

setup();