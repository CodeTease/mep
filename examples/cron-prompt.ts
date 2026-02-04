// Originally from example.ts

import { MepCLI } from "../src"

try {
    const schedule = await MepCLI.cron({
        message: "Set backup schedule (Cron):",
        initial: "0 4 * * *" // Daily at 4:00 AM
    });
    console.log(`\n Cron Result: "${schedule}"`);

} catch (e) {
    if (e instanceof Error && e.message === 'User force closed') {
         console.log("\nOperation cancelled by user.");
    } else {
         console.error("\nAn error occurred:", e);
    }
}