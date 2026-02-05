// Originally from example.ts

import { MepCLI } from "../src"

try {
    const nextVersion = await MepCLI.semver({
        message: "Bump Package Version:",
        currentVersion: "1.0.5"
    });
    console.log(`\n SemVer Result: ${nextVersion}`);
} catch (e) {
    if (e instanceof Error && e.message === 'User force closed') {
         console.log("\nOperation cancelled by user.");
    } else {
         console.error("\nAn error occurred:", e);
    }
}