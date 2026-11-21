import type { SelectChoice, SemVerOptions } from '../types';
import { SelectPrompt } from './select';

export class SemVerPrompt extends SelectPrompt<string> {
    constructor(options: SemVerOptions) {
        const { currentVersion, ...baseOptions } = options;
        const [major, minor, patch] = SemVerPrompt.parseVersion(currentVersion) || [0, 0, 1];
        const validVersion = `${major}.${minor}.${patch}`;

        const choices: SelectChoice<string>[] = [
            {
                title: `Patch (${validVersion} -> ${major}.${minor}.${patch + 1})`,
                value: `${major}.${minor}.${patch + 1}`,
            },
            {
                title: `Minor (${validVersion} -> ${major}.${minor + 1}.0)`,
                value: `${major}.${minor + 1}.0`,
            },
            {
                title: `Major (${validVersion} -> ${major + 1}.0.0)`,
                value: `${major + 1}.0.0`,
            },
        ];

        super({ ...baseOptions, choices });
    }

    private static parseVersion(version: string): [number, number, number] | null {
        // Accept a leading 'v'/'=' and surrounding whitespace, optional minor/patch
        // components, and ignore prerelease and build metadata.
        const match = version.trim().match(/^[v=]?\s*(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:[-+][0-9A-Za-z.+-]+)?$/);
        if (!match) return null;

        const major = Number(match[1]);
        const minor = Number(match[2] ?? 0);
        const patch = Number(match[3] ?? 0);
        return [major, minor, patch];
    }
}
