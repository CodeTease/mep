// Originally from example.ts

import { MepCLI } from "../src"

try {
    const themeColor = await MepCLI.color({
        message: "Pick your brand color (RGB):",
        initial: "#6366f1"
    });
    console.log(`\n Color Result: "${themeColor}"`);

} catch (e) {
    if (e instanceof Error && e.message === 'User force closed') {
        console.log("\nOperation cancelled by user.");
    } else {
        console.error("\nAn error occurred:", e);
    }
}