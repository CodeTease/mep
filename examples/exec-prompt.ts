import { MepCLI } from '../src';

async function main() {
    console.clear();
    console.log("--- Exec Prompt Demo ---");
    console.log("This prompt runs a shell command and displays its status and output.\n");

    try {
        // 1. Simple success command
        console.log("\n1. Running a simple command (ls -la)...");
        await MepCLI.exec({
            message: "Listing files...",
            command: "ls -la"
        });
        console.log("✔ Command finished successfully.");

        // 2. Long running command with output
        console.log("\n2. Running a long process (simulating build)...");
        // Using node -e to simulate output over time
        const script = `
            const total = 5;
            let i = 0;
            const interval = setInterval(() => {
                i++;
                console.log('Step ' + i + '/' + total + ': Processing data...');
                if (i >= total) {
                    clearInterval(interval);
                }
            }, 500);
        `;
        
        await MepCLI.exec({
            message: "Building project...",
            command: `node -e "${script.replace(/\n/g, ' ').replace(/"/g, '\\"')}"`
        });
        console.log("✔ Build finished.");

        // 3. Failure command
        console.log("\n3. Running a failing command...");
        try {
            await MepCLI.exec({
                message: "Checking non-existent file...",
                command: "cat non_existent_file_12345.txt"
            });
        } catch (err: any) {
            console.log(`✖ Expected error caught: ${err.message}`);
            if (err.stderr) {
                console.log(`  Stderr: ${err.stderr.trim()}`);
            }
        }

        // 4. Timeout command
        console.log("\n4. Running a command that times out...");
        try {
            await MepCLI.exec({
                message: "Sleeping for 5s (Timeout 2s)...",
                command: "node -e \"setTimeout(() => {}, 5000)\"",
                timeout: 2000
            });
        } catch (err: any) {
             console.log(`✖ Expected timeout caught: ${err.message}`);
        }

    } catch (e) {
        console.log("\nGlobal catch:", e);
    }
}

main();
