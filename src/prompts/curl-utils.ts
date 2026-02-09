export type ShellType = 'bash' | 'powershell' | 'cmd';

export interface ShellStrategy {
    binary: string;
    wrapper: string;
    continuation: string;
    escape(value: string): string;
}

export class BashStrategy implements ShellStrategy {
    readonly binary = 'curl';
    readonly wrapper = "'";
    readonly continuation = ' \\';

    escape(value: string): string {
        // e.g. "It's me" -> 'It'\''s me'
        return `'${value.replace(/'/g, "'\\''")}'`;
    }
}

export class PowerShellStrategy implements ShellStrategy {
    readonly binary = 'curl.exe';
    readonly wrapper = "'";
    readonly continuation = ' `';

    escape(value: string): string {
        // e.g. "It's me" -> 'It''s me'
        return `'${value.replace(/'/g, "''")}'`;
    }
}

export class CmdStrategy implements ShellStrategy {
    readonly binary = 'curl';
    readonly wrapper = '"';
    readonly continuation = ' ^';

    escape(value: string): string {
        // e.g. {"key": "value"} -> "{\"key\": \"value\"}"
        // e.g. value with " -> "value with \""
        return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
    }
}
