// Originally from example.ts
// with a little change

import { MepCLI } from "../src"

try {
    const spamConfirmed = await MepCLI.spam({
        message: "Hold on! Confirm deployment by mashing the Space key!",
        threshold: 20, // Harder
        decay: true,
        spamKey: ' ' // Space key
    });
    console.log(`\n Spam Result: Deployment confirmed: ${spamConfirmed}`);

} catch (e) {
    if (e instanceof Error && e.message === 'User force closed') {
        console.log("\nOperation cancelled by user.");
    } else {
        console.error("\nAn error occurred:", e);
    }
}