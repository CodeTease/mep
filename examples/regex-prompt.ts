import { MepCLI } from '../src';

async function runRegexDemo() {
    console.clear();
    console.log("--- MepCLI Regex Prompt Demo ---\n");
    console.log('Instructions: Type a regex pattern. E.g. "^[a-z]+@". Matches will update below.');

    try {
        const regex = await MepCLI.regex({
            message: 'Enter a regex to match email-like patterns:',
            tests: [
                'test@example.com',
                'invalid-email',
                'user.name@sub.domain.co.uk',
                '@missinguser.com',
                '123456'
            ]
        });
        console.log(`\nResult Regex: ${regex}`);
    } catch (e) {
        if (e instanceof Error && e.message === 'User force closed') {
            console.log("\nOperation cancelled by user.");
       } else {
            console.error("\nError:", e);
       }
    }
}

runRegexDemo();
