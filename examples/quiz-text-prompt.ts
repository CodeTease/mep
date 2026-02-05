// Originally from example.ts

import { MepCLI } from "../src"

try {
    const quizResult2 = await MepCLI.quizText({
        message: "Quiz: What is the largest planet in our solar system?",
        correctAnswer: "Jupiter",
        explanation: "Jupiter is a gas giant and the largest planet.",
        // Optional custom verify function (e.g., allow case insensitive)
        verify: (val) => val.trim().toLowerCase() === "jupiter"
    });
    console.log(`\n Quiz Text Result: ${quizResult2}`);
} catch (e) {
    if (e instanceof Error && e.message === 'User force closed') {
         console.log("\nOperation cancelled by user.");
    } else {
         console.error("\nAn error occurred:", e);
    }
}