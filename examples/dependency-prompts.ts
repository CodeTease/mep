import { MepCLI } from '../src/core';
import { DependencyItem } from '../src/types';

async function run() {
    console.clear();
    console.log('--- Full Stack Installation Wizard ---');
    console.log('This demonstrates complex dependency resolution logic.');

    const stack: DependencyItem<string>[] = [
        // Backend
        { title: 'Node.js Runtime', value: 'node', selected: true },
        { title: 'Express.js Framework', value: 'express', dependsOn: ['node'] },
        { title: 'NestJS Framework', value: 'nestjs', dependsOn: ['node'], conflictsWith: ['express'] },

        // Database
        { title: 'PostgreSQL Database', value: 'postgres' },
        { title: 'Prisma ORM', value: 'prisma', dependsOn: ['node'], conflictsWith: ['typeorm'] },
        { title: 'TypeORM', value: 'typeorm', dependsOn: ['node'], conflictsWith: ['prisma'] },

        // Frontend
        { title: 'React Frontend', value: 'react', triggers: ['vite'] },
        { title: 'Vue Frontend', value: 'vue', triggers: ['vite'], conflictsWith: ['react'] },
        { title: 'Vite Bundler', value: 'vite' },

        // Tools
        { title: 'Docker Support', value: 'docker', triggers: ['docker-compose'] },
        { title: 'Docker Compose', value: 'docker-compose', dependsOn: ['docker'] }
    ];

    try {
        const selected = await MepCLI.dependency({
            message: 'Select your stack components:',
            choices: stack,
            min: 1
        });

        console.log('\n--- Selected Stack ---');
        console.log(selected);
    } catch (e) {
        console.log('Exited:', e);
    }
}

run();
