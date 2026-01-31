import { SelectPrompt } from './select';
import { SemVerOptions, SelectChoice } from '../types';

export class SemVerPrompt extends SelectPrompt<string> {
    constructor(options: SemVerOptions) {
        const { currentVersion, ...baseOptions } = options;
        const validVersion = SemVerPrompt.parseVersion(currentVersion) || '0.0.1';
        const [major, minor, patch] = validVersion.split('.').map(Number);

        const choices: SelectChoice<string>[] = [
            {
                title: `Patch (${validVersion} -> ${major}.${minor}.${patch + 1})`,
                value: `${major}.${minor}.${patch + 1}`
            },
            {
                title: `Minor (${validVersion} -> ${major}.${minor + 1}.0)`,
                value: `${major}.${minor + 1}.0`
            },
            {
                title: `Major (${validVersion} -> ${major + 1}.0.0)`,
                value: `${major + 1}.0.0`
            }
        ];

        super({ ...baseOptions, choices });
    }

    private static parseVersion(version: string): string | null {
        // Simple SemVer regex: x.y.z
        const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
        return match ? match[0] : null;
    }
}
