// Originally from examples/data-visualization.ts

import { MepCLI } from "../src"

try {
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
} catch (e) {
    if (e instanceof Error && e.message === 'User force closed') {
         console.log("\nOperation cancelled by user.");
    } else {
         console.error("\nAn error occurred:", e);
    }
}