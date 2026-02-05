// Originally from examples/data-visualization.ts

import { MepCLI } from "../src"

try {
    const availability = await MepCLI.heatmap({
        message: "Set your weekly availability:",
        rows: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        columns: ["Morning", "Afternoon", "Evening"],
        legend: [
            { value: 0, char: "x", color: (s) => `\x1b[31m${s}\x1b[0m` }, // Red (Busy)
            { value: 1, char: "o", color: (s) => `\x1b[32m${s}\x1b[0m` }  // Green (Free)
        ]
    });
    console.log("Availability Map:", availability);
} catch (e) {
    if (e instanceof Error && e.message === 'User force closed') {
         console.log("\nOperation cancelled by user.");
    } else {
         console.error("\nAn error occurred:", e);
    }
}