import { MepCLI } from '../src';

async function main() {
    console.clear();
    console.log("--- MepCLI Form & Date Prompts Demo ---\n");

    try {
        // 1. Form Prompt
        const user = await MepCLI.form({
            message: "User Registration:",
            fields: [
                { name: "username", message: "Username", initial: "user1" },
                { name: "email", message: "Email", validate: (v) => v.includes("@") || "Invalid email" },
                { name: "role", message: "Job Role", initial: "Developer" }
            ]
        });
        console.log("User Data:", user);

        // 2. Date Prompt
        const now = new Date();
        const eventDate = await MepCLI.date({
            message: "When is the event?",
            initial: now,
            min: now
        });
        console.log(`Event Date: ${eventDate.toLocaleString()}`);

        // 3. Time Prompt
        const meetingTime = await MepCLI.time({
            message: "Set meeting time:",
            format: "12h",
            step: 15
        });
        console.log(`Time: ${meetingTime}`);

        // 4. Color Prompt
        const themeColor = await MepCLI.color({
            message: "Pick a theme color:",
            initial: "#ff0000"
        });
        console.log(`Color: ${themeColor}`);

        // 5. List Prompt
        const tags = await MepCLI.list({
            message: "Enter tags (Enter to add, Double Enter to submit):",
            initial: ["cli", "node"]
        });
        console.log(`Tags: [${tags.join(', ')}]`);

    } catch (e) {
        if (e instanceof Error && e.message === 'User force closed') {
            console.log("\nOperation cancelled by user.");
        } else {
            console.error("\nAn error occurred:", e);
        }
    }
}

main();
