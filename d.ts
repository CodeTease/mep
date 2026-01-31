import { MepCLI } from "./src";

const weeklyAvailability = await MepCLI.heatmap({
    message: "Set Availability (0=Busy, 1=Free, 2=Preferred):",
    rows: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    columns: ["9AM", "1PM", "5PM"],
    legend: [
        { value: 0, char: "x", color: (s) => `\x1b[31m${s}\x1b[0m` }, // Red
        { value: 1, char: "o", color: (s) => `\x1b[33m${s}\x1b[0m` }, // Yellow
        { value: 2, char: "✓", color: (s) => `\x1b[32m${s}\x1b[0m` }  // Green
    ]
});
console.log(`\n Heatmap Result:`, weeklyAvailability);