// originally from example.ts

import { MepCLI } from "../src"

try {
    const permissions = await MepCLI.grid({
        message: "Configure Access Permissions:",
        rows: ["Admin", "User", "Guest"],
        columns: ["Read", "Write", "Execute"]
    });
    console.log(`\n Grid Result: (Boolean Matrix)`, permissions);

} catch (e) {
    if (e instanceof Error && e.message === 'User force closed') {
         console.log("\nOperation cancelled by user.");
    } else {
         console.error("\nAn error occurred:", e);
    }
}