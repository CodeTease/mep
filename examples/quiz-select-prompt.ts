// Originally from example.ts

import { MepCLI } from "../src"

try {
    const quizResult1 = await MepCLI.quizSelect({
        message: "Quiz: Which language runs in the browser?",
        choices: [
            { title: "C++", value: "cpp" },
            { title: "JavaScript", value: "js" },
            { title: "Python", value: "py" }
        ],
        correctValue: "js",
        explanation: "JavaScript is the primary scripting language for the web."
    });
    console.log(`\n Quiz Select Result: ${quizResult1}`);
} catch (e) {
    if (e instanceof Error && e.message === 'User force closed') {
         console.log("\nOperation cancelled by user.");
    } else {
         console.error("\nAn error occurred:", e);
    }
}