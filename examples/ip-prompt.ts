// Originally from example.ts
// with a litlle change

import { MepCLI } from "../src"

try {
    const ipAddress = await MepCLI.ip({
        message: "Enter Server IP Address:"
    });
    console.log(`\n IP Result: ${ipAddress}`);
} catch (e) {
    if (e instanceof Error && e.message === 'User force closed') {
         console.log("\nOperation cancelled by user.");
    } else {
         console.error("\nAn error occurred:", e);
    }
}