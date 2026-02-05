// Template for creating new example files

import { MepCLI } from "../src"

try {
    // Your prompt logic here
} catch (e) {
    if (e instanceof Error && e.message === 'User force closed') {
         console.log("\nOperation cancelled by user.");
    } else {
         console.error("\nAn error occurred:", e);
    }
}