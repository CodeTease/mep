// Originally from examples/form-prompts.ts

import { MepCLI } from '../src';

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

} catch (e) {
    if (e instanceof Error && e.message === 'User force closed') {
         console.log("\nOperation cancelled by user.");
    } else {
         console.error("\nAn error occurred:", e);
    }
}