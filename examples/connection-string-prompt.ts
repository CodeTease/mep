import { MepCLI } from '../src';

async function main() {
    console.clear();
    console.log("--- Connection String Wizard Demo ---");
    console.log("This wizard guides you through creating a valid connection string.");
    console.log("It handles protocol selection, defaults, and credential encoding.\n");

    try {
        // Example 1: Standard DB setup
        console.log("Example 1: Full Database Setup");
        const result1 = await MepCLI.connectionString({
            message: "Configure Primary Database",
            // You can override default ports if needed
            defaults: {
                postgres: 5433
            }
        });

        console.log("\n--- Result 1 ---");
        console.log("Raw URL:", result1.raw);
        console.log("Parts:", JSON.stringify(result1.parts, null, 2));

        console.log("\n--------------------------------\n");

        // Example 2: SQLite (Simpler flow)
        console.log("Example 2: SQLite Setup (Select 'sqlite' to see file picker)");
        const result2 = await MepCLI.connectionString({
            message: "Configure Local Cache",
            protocols: ['sqlite', 'redis']
        });

        console.log("\n--- Result 2 ---");
        console.log("Raw URL:", result2.raw);

    } catch (_e) {
        console.log("Cancelled by user");
    }
}

main();
