import { ANSI } from './ansi';
import { theme } from './theme';

type Highlighter = (code: string) => string;

// --- 1. JSON Highlighter ---
export function highlightJson(json: string): string {
    if (!json) return '';
    const tokenRegex = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"?)|(-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)|(true|false|null)|([{}[\],:])/g;

    let result = '';
    let lastIndex = 0;
    let match;

    while ((match = tokenRegex.exec(json)) !== null) {
        if (match.index > lastIndex) {
            result += json.substring(lastIndex, match.index);
        }

        const token = match[0];
        
        if (token.startsWith('"')) {
            const remaining = json.substring(tokenRegex.lastIndex);
            // Heuristic for keys: followed by optional whitespace and a colon
            if (/^\s*:/.test(remaining)) {
                result += `${theme.syntax.key}${token}${ANSI.RESET}`;
            } else {
                result += `${theme.syntax.string}${token}${ANSI.RESET}`;
            }
        }
        else if (/^-?\d/.test(token)) {
             result += `${theme.syntax.number}${token}${ANSI.RESET}`;
        }
        else if (/^(true|false|null)$/.test(token)) {
            result += (token === 'null') 
                ? `${theme.syntax.null}${token}${ANSI.RESET}`
                : `${theme.syntax.boolean}${token}${ANSI.RESET}`;
        }
        else if (/^[{}[\],:]$/.test(token)) {
            result += `${theme.syntax.punctuation}${token}${ANSI.RESET}`;
        }
        else {
            result += token;
        }

        lastIndex = tokenRegex.lastIndex;
    }

    if (lastIndex < json.length) {
        result += json.substring(lastIndex);
    }
    return result;
}

// --- 2. ENV Highlighter ---
export function highlightEnv(env: string): string {
    if (!env) return '';
    return env.split('\n').map(line => {
        if (line.trim().startsWith('#')) {
            return `${theme.muted}${line}${ANSI.RESET}`;
        }
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const [, key, value] = match;
            return `${theme.syntax.key}${key}${theme.syntax.punctuation}=${theme.syntax.string}${value}${ANSI.RESET}`;
        }
        return line;
    }).join('\n');
}

// --- 3. TOML Highlighter ---
export function highlightToml(toml: string): string {
    if (!toml) return '';
    return toml.split('\n').map(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('#')) {
            return `${theme.muted}${line}${ANSI.RESET}`;
        }
        // [section]
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
             return `${theme.syntax.key}${line}${ANSI.RESET}`;
        }
        // Key = Value
        const match = line.match(/^(\s*[\w\d_-]+)(\s*=)/);
        if (match) {
             const fullMatch = match[0];
             const keyPart = match[1];
             const eqPart = match[2];
             const rest = line.substring(fullMatch.length);
             return `${theme.syntax.key}${keyPart}${ANSI.RESET}${theme.syntax.punctuation}${eqPart}${theme.syntax.string}${rest}${ANSI.RESET}`;
        }
        return line;
    }).join('\n');
}

// --- 4. CSV Highlighter ---
export function highlightCsv(csv: string): string {
    if (!csv) return '';
    // Cycle through colors to differentiate columns
    const colors = [theme.syntax.string, theme.syntax.key, theme.syntax.number, theme.syntax.boolean];
    
    return csv.split('\n').map(line => {
        if (!line.trim()) return line;
        // Split by comma, ignoring commas inside double quotes
        // Regex explanation: Match comma only if followed by an even number of quotes (or 0) until end of line
        const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        
        return parts.map((part, index) => {
            const color = colors[index % colors.length];
            return `${color}${part}${ANSI.RESET}`;
        }).join(`${theme.syntax.punctuation},${ANSI.RESET}`);
    }).join('\n');
}

// --- 5. Shell/Bash Highlighter ---
export function highlightShell(script: string): string {
    if (!script) return '';
    
    // Simple replacements for common shell patterns
    // 1. Comments
    // 2. Keywords
    // 3. Variables
    
    const keywords = /\b(if|then|else|elif|fi|for|in|do|done|while|case|esac|return|exit|export|source|echo|printf)\b/g;
    
    return script.split('\n').map(line => {
        if (line.trim().startsWith('#')) {
            return `${theme.muted}${line}${ANSI.RESET}`;
        }
        
        // Temporarily hide strings properly is hard with regex replace, 
        // so we just do best-effort highlights for keywords and vars outside of checking quote context.
        const processed = line
            .replace(keywords, match => `${theme.syntax.boolean}${match}${ANSI.RESET}`)
            .replace(/(\$[\w\d_]+|\$\{[^}]+\})/g, match => `${theme.syntax.key}${match}${ANSI.RESET}`)
            .replace(/(\s|^)(-{1,2}[a-zA-Z0-9_-]+)/g, (_match, prefix, flag) => `${prefix}${theme.syntax.number}${flag}${ANSI.RESET}`);
            
        return processed;
    }).join('\n');
}

// --- 6. Properties Highlighter ---
export function highlightProperties(props: string): string {
    if (!props) return '';
    return props.split('\n').map(line => {
        const trimmed = line.trim();
        // Supports # or ! for comments
        if (trimmed.startsWith('#') || trimmed.startsWith('!')) {
            return `${theme.muted}${line}${ANSI.RESET}`;
        }
        // Keys can be separated by = or :
        const match = line.match(/^([^=:]+)([=:])(.*)$/);
        if (match) {
            const [, key, sep, value] = match;
            return `${theme.syntax.key}${key}${theme.syntax.punctuation}${sep}${theme.syntax.string}${value}${ANSI.RESET}`;
        }
        return line;
    }).join('\n');
}

// --- Main Mapping ---
const highlighters: Record<string, Highlighter> = {
    'json': highlightJson,
    'env': highlightEnv,
    'toml': highlightToml,
    'csv': highlightCsv,
    'sh': highlightShell,
    'bash': highlightShell,
    'zsh': highlightShell,
    'properties': highlightProperties,
    'props': highlightProperties,
    'conf': highlightProperties // loose convention
};

export function highlight(code: string, language: string): string {
    const lang = language.toLowerCase();
    const highlightFunc = highlighters[lang];
    
    if (highlightFunc) {
        return highlightFunc(code);
    }
    
    // Fallback: If no highlighter found, return original code
    return code;
}