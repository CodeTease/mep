// Originally from example.ts

import { MepCLI } from "../src"

try {
    const meetingTime = await MepCLI.time({
        message: "Schedule Daily Standup:",
        format: "12h",
        step: 15,
        initial: new Date()
    });
    console.log(`\n Time Result: ${meetingTime}`);
} catch (e) {
    if (e instanceof Error && e.message === 'User force closed') {
        console.log("\nOperation cancelled by user.");
    } else {
        console.error("\nAn error occurred:", e);
    }
}