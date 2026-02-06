import { MepCLI } from '../src/core';

async function main() {
    console.log('Starting Task Runner Demo...\n');

    const tasks = MepCLI.tasks();

    tasks.add('install', { title: 'Installing dependencies', type: 'spinner' });
    tasks.add('download', { title: 'Downloading core files', type: 'progress', total: 100 });
    tasks.add('build', { title: 'Building project', type: 'spinner' });

    tasks.run();

    // Start tasks
    tasks.start('install');
    tasks.start('download');

    console.log("This log should be buffered and shown at the end!");

    // Simulate Download
    let progress = 0;
    const downloadInterval = setInterval(() => {
        progress += 5;
        tasks.update('download', {
            current: progress,
            message: `${progress}/100 MB`
        });

        if (progress >= 100) {
            clearInterval(downloadInterval);
            tasks.success('download', 'Download complete!');

            // Start build after download
            tasks.start('build');
        }
    }, 100);

    // Simulate Install
    setTimeout(() => {
        tasks.success('install', 'Dependencies installed.');
    }, 1500);

    // Simulate Build Warning then Success
    setTimeout(() => {
        tasks.warning('build', 'Build warning: Low memory');

        setTimeout(() => {
            tasks.success('build', 'Build successful');

            // Add dynamic task
            tasks.add('deploy', { title: 'Deploying to server', type: 'spinner' });
            tasks.start('deploy');

            setTimeout(() => {
                tasks.success('deploy', 'Deployed!');
                tasks.stop();
            }, 1000);
        }, 1500);
    }, 2500);
}

main().catch(console.error);
