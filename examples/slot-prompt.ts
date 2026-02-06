// Originally from example.ts

import { MepCLI } from "../src"

try {
    const slotPrize = await MepCLI.slot({
        message: "Spin for your daily bonus:",
        choices: ["💎 Diamond", "🥇 Gold", "🥈 Silver", "🥉 Bronze", "🪵 Wood"],
        rows: 5
    });
    console.log(`\n Slot Result: ${slotPrize}`);
} catch (e) {
    if (e instanceof Error && e.message === 'User force closed') {
        console.log("\nOperation cancelled by user.");
    } else {
        console.error("\nAn error occurred:", e);
    }
}