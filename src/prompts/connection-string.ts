import { SelectPrompt } from './select';
import { TextPrompt } from './text';
import { NumberPrompt } from './number';
import { ConfirmPrompt } from './confirm';
import { FilePrompt } from './file';

export interface ConnectionStringOptions {
    message: string;
    protocols?: string[];
    defaults?: Record<string, number>;
}

export interface ConnectionStringResult {
    raw: string;
    parts: {
        protocol: string;
        host?: string;
        port?: number;
        user?: string;
        password?: string;
        database?: string;
        filePath?: string;
    };
}

const DEFAULT_PROTOCOLS = ['postgres', 'mysql', 'mongodb', 'redis', 'amqp', 'sqlite'];

const DEFAULT_PORTS: Record<string, number> = {
    postgres: 5432,
    mysql: 3306,
    mongodb: 27017,
    redis: 6379,
    amqp: 5672,
};

export async function connectionString(options: ConnectionStringOptions): Promise<ConnectionStringResult> {
    const protocols = options.protocols || DEFAULT_PROTOCOLS;
    const defaults = { ...DEFAULT_PORTS, ...options.defaults };

    // 1. Protocol Selection
    const protocol = await new SelectPrompt({
        message: options.message,
        choices: protocols.map(p => ({ title: p, value: p })),
    }).run();

    let parts: ConnectionStringResult['parts'] = { protocol };
    let raw = '';

    if (protocol === 'sqlite') {
        // SQLite: File Path
        const filePath = await new FilePrompt({
            message: 'Database file path',
        }).run();
        parts.filePath = filePath;
        // Construct SQLite URI
        raw = `sqlite://${filePath}`;
    } else {
        // Network Database
        // 2. Host
        const host = await new TextPrompt({
            message: 'Host',
            initial: 'localhost',
            placeholder: 'localhost',
        }).run();
        parts.host = host;

        // 3. Port
        const defaultPort = defaults[protocol];
        const port = await new NumberPrompt({
            message: 'Port',
            initial: defaultPort,
        }).run();
        parts.port = port;

        // 4. Auth
        const hasAuth = await new ConfirmPrompt({
            message: 'Authentication required?',
            initial: true,
        }).run();

        if (hasAuth) {
            const user = await new TextPrompt({
                message: 'Username',
                initial: 'root', // Common default
            }).run();
            parts.user = user;

            // Use TextPrompt with empty mask for secret handling
            const password = await new TextPrompt({
                message: 'Password',
                mask: '*', // Mask with asterisks
            }).run();
            parts.password = password;
        }

        // 5. Database
        const database = await new TextPrompt({
            message: 'Database name',
        }).run();
        parts.database = database;

        // Construct URL
        try {
            // Use URL object for safe construction and encoding
            const u = new URL(`${protocol}://${host}:${port}/${database}`);
            if (parts.user) u.username = parts.user;
            if (parts.password) u.password = parts.password;
            raw = u.toString();
        } catch (e) {
            // Fallback manual construction with encoding
            const userEncoded = parts.user ? encodeURIComponent(parts.user) : '';
            const passEncoded = parts.password ? encodeURIComponent(parts.password) : '';
            let authPart = '';
            if (userEncoded || passEncoded) {
                authPart = `${userEncoded}:${passEncoded}@`;
            }
            raw = `${protocol}://${authPart}${host}:${port}/${parts.database}`;
        }
    }

    return { raw, parts };
}
