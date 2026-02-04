// Originally from example.ts

import { MepCLI } from "../src"

try {
    const envVars = await MepCLI.map({
        message: "Configure Environment Variables (Map):",
        initial: { "API_URL": "http://localhost:8080", "DB_HOST": "127.0.0.1" }
    });
    console.log(`\n Map Result:`, envVars);

} catch (e) {
    if (e instanceof Error && e.message === 'User force closed') {
         console.log("\nOperation cancelled by user.");
    } else {
         console.error("\nAn error occurred:", e);
    }
}