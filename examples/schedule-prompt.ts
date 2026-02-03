// Originally from example.ts

import { MepCLI } from '../src'

try {
    const timeline = await MepCLI.schedule({
        message: "Project Timeline (Shift+Arrows to resize):",
        data: [
            { name: "Planning", start: new Date(), end: new Date(Date.now() + 86400000 * 2) },
            { name: "Development", start: new Date(Date.now() + 86400000 * 3), end: new Date(Date.now() + 86400000 * 7) }
        ]
    });
    console.log(`\n Schedule Result:`, timeline);
} catch (e) {
    if (e instanceof Error && e.message === 'User force closed') {
        console.log("\nOperation cancelled by user.");
    } else {
        console.error("\nAn error occurred:", e);
    }

}