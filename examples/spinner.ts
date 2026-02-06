// Originally from example.ts

import { MepCLI } from "../src"

try {
    const s = MepCLI.spinner("Finalizing configuration and deploying...").start();
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulates a 1.5 second async task
    s.success();

    console.log("\n--- Deployment successful! All MepCLI features demonstrated! ---");
} catch (e) {
    if (e instanceof Error && e.message === 'User force closed') {
        console.log("\nOperation cancelled by user.");
    } else {
        console.error("\nAn error occurred:", e);
    }
}