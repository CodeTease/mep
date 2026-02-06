// Originally from example.ts

import { MepCLI } from "../src"

try {
    const gaugeScore = await MepCLI.gauge({
        message: "Stop the needle in the GREEN zone!",
        width: 40,
        safeZone: 0.15 // 15% safe zone
    });
    console.log(`\n Gauge Result: ${gaugeScore}`);
} catch (e) {
    if (e instanceof Error && e.message === 'User force closed') {
        console.log("\nOperation cancelled by user.");
    } else {
        console.error("\nAn error occurred:", e);
    }
}