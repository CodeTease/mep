import { MepCLI } from '../src/core';

async function run() {
    console.clear();
    console.log('--- License Picker Demo ---');
    console.log('This uses the Split View layout to show license details.');

    try {
        const license = await MepCLI.license({
            message: 'Select a license for your project:',
            defaultLicense: 'MIT' // Pre-select MIT
        });
        
        console.log(`\nYour project is now licensed under: ${license}`);
    } catch (e) {
        console.log('Exited:', e);
    }
}

run();
