import { MepCLI } from '../src';

async function main() {
    console.clear();
    console.log("--- MepCLI Basic Prompts Demo ---\n");

    try {
        // 1. Text Prompt
        const name = await MepCLI.text({
            message: "What is your name?",
            placeholder: "Guest",
            validate: (value) => value.length > 0 || "Name cannot be empty"
        });
        console.log(`Name: ${name}`);

        // 2. Password Prompt
        const password = await MepCLI.password({
            message: "Set a password:",
            validate: (value) => value.length >= 6 || "Password must be at least 6 chars"
        });
        console.log(`Password set (length: ${password.length})`);

        // 3. Number Prompt
        const age = await MepCLI.number({
            message: "Enter your age:",
            min: 1,
            max: 120,
            initial: 25
        });
        console.log(`Age: ${age}`);

        // 4. Toggle Prompt
        const subscribe = await MepCLI.toggle({
            message: "Subscribe to newsletter?",
            initial: true,
            activeText: "Yes",
            inactiveText: "No"
        });
        console.log(`Subscribed: ${subscribe}`);

        // 5. Confirm Prompt
        const confirm = await MepCLI.confirm({
            message: "Are you sure you want to proceed?",
            initial: true
        });
        console.log(`Proceed: ${confirm}`);

    } catch (e) {
        if (e instanceof Error && e.message === 'User force closed') {
             console.log("\nOperation cancelled by user.");
        } else {
             console.error("\nAn error occurred:", e);
        }
    }
}

main();
