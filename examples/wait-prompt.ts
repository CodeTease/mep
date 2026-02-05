// Originally from example.ts
// with a little change

import { MepCLI } from "../src"

try {
    await MepCLI.wait({
        message: "Please wait while we finalize the setup...",
        seconds: 5, 
        autoSubmit: true // Automatically proceeds after time is up
    });
    console.log("\n Wait Result: Wait complete.");
} catch (e) {
    if (e instanceof Error && e.message === 'User force closed') {
         console.log("\nOperation cancelled by user.");
    } else {
         console.error("\nAn error occurred:", e);
    }
}