// Orinally from example.ts

import { MepCLI } from "../src"

try {
    const size = await MepCLI.byte({
        message: "Set docker container memory limit",
        initial: 512 * 1024 * 1024, // 512 MB
        min: 1024 * 1024 // Min 1 MB
    });
    console.log(`Configured: ${size} bytes`);
} catch (e) {
    if (e instanceof Error && e.message === 'User force closed') {
        console.log("\nOperation cancelled by user.");
    } else {
        console.error("\nAn error occurred:", e);
    }
}