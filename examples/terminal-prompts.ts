import { MepCLI } from '../src/core';

async function run() {
    console.clear();
    console.log('--- Restricted Terminal Simulation ---');
    console.log('You are in a restricted shell. Only "date", "whoami", and "echo" are allowed.');
    
    try {
        await MepCLI.terminal({
            message: 'Restricted Shell (Ctrl+D to exit)',
            allowedCommands: ['date', 'whoami', 'echo'],
            maxHeight: 12,
            cwd: process.cwd() // Show current working directory
        });
        
        console.log('\nSession closed.');
    } catch (e) {
        console.log('Exited:', e);
    }
}

run();
