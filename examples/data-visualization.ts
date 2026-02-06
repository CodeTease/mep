import { MepCLI } from '../src';

async function main() {
    console.clear();
    console.log("--- MepCLI Data Visualization & Interactive Prompts Demo ---\n");

    try {
        // 1. Table Prompt
        const userId = await MepCLI.table({
            message: "Select a user from the table:",
            columns: ["ID", "Name", "Role", "Status"],
            data: [
                { value: 1, row: ["001", "Alice", "Admin", "Active"] },
                { value: 2, row: ["002", "Bob", "Dev", "Busy"] },
                { value: 3, row: ["003", "Charlie", "User", "Offline"] },
                { value: 4, row: ["004", "David", "Manager", "Active"] },
            ]
        });
        console.log(`Selected User ID: ${userId}`);

        // 2. Heatmap Prompt
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

        // 3. Kanban Prompt
        const tasks = await MepCLI.kanban({
            message: "Organize your tasks (Drag & Drop with Space):",
            columns: [
                {
                    id: "todo",
                    title: "To Do",
                    items: [
                        { id: "t1", title: "Write Documentation" },
                        { id: "t2", title: "Fix Bugs" }
                    ]
                },
                {
                    id: "doing",
                    title: "In Progress",
                    items: [
                        { id: "t3", title: "Develop Feature A" }
                    ]
                },
                {
                    id: "done",
                    title: "Done",
                    items: []
                }
            ]
        });
        console.log("Kanban Board State:", tasks);

        // 4. Schedule Prompt
        const timeline = await MepCLI.schedule({
            message: "Adjust Project Timeline:",
            data: [
                { name: "Phase 1", start: new Date(), end: new Date(Date.now() + 86400000 * 2) },
                { name: "Phase 2", start: new Date(Date.now() + 86400000 * 3), end: new Date(Date.now() + 86400000 * 5) }
            ]
        });
        console.log("Updated Schedule:", timeline);

        // 5. Draw Prompt
        const drawing = await MepCLI.draw({
            message: "Draw something (Braille canvas):",
            width: 20,
            height: 10,
            exportType: 'text'
        });
        console.log(`\nDrawing Output:\n${drawing}`);

    } catch (e) {
        if (e instanceof Error && e.message === 'User force closed') {
            console.log("\nOperation cancelled by user.");
        } else {
            console.error("\nAn error occurred:", e);
        }
    }
}

main();
