import { MepCLI } from '../src';

async function runExamples() {
    console.log("--- MepCLI Calendar Prompt Demo ---");

    const handleError = (e: unknown, context = ''): boolean => {
        if (e instanceof Error && e.message === 'User force closed') {
            console.log(`\n${context}Operation cancelled by user.`);
            return true;
        }
        console.error(`\n${context}An error occurred:`, e);
        return false;
    };

    // 1. Single Date Selection
    try {
        const deploymentDate = await MepCLI.calendar({
            message: 'Pick a deployment date:',
            mode: 'single'
        });
        console.log(`Target deployment: ${deploymentDate}`);
    } catch (e) {
        if (handleError(e, 'Single date: ')) return;
    }

    // 2. Single Range Selection
    try {
        const vacation = await MepCLI.calendar({
            message: 'Select your vacation range:',
            mode: 'range',
            initial: [new Date(2026, 5, 1), new Date(2026, 5, 10)] // June 1st to 10th
        });
        if (Array.isArray(vacation)) {
            console.log(`Vacation planned from: ${vacation[0]} to ${vacation[1]}`);
        }
    } catch (e) {
        if (handleError(e, 'Vacation range: ')) return;
    }

    // 3. Multiple Range Selection
    try {
        const windows = await MepCLI.calendar({
            message: 'Select maintenance windows (Multiple ranges allowed):',
            mode: 'range',
            multiple: true,
            weekStart: 1 // Start week on Monday because we're productive!
        });
        console.log(`Maintenance windows:`, windows);
    } catch (e) {
        if (handleError(e, 'Maintenance windows: ')) return;
    }

    // 4. Multiple Single Dates Selection
    try {
        const releaseDays = await MepCLI.calendar({
            message: 'Select release days for the next sprints:',
            mode: 'single',
            multiple: true
        });
        console.log(`Release schedule:`, releaseDays);
    } catch (e) {
        if (handleError(e, 'Release days: ')) return;
    }
}

runExamples().catch(e => {
    if (e instanceof Error && e.message === 'User force closed') {
        console.log("\nOperation cancelled by user.");
    } else {
        console.error(e);
    }
});
