import { ANSI } from './ansi';
import { theme } from './theme';

export function highlightJson(json: string): string {
    if (!json) return '';
    
    // Updated Regex for better partial matching and separation
    // 1. Strings (keys or values), allowing unclosed quotes for partial typing
    // 2. Numbers
    // 3. Booleans/Null
    // 4. Punctuation (separated colon from keys logic)
    
    // Regex explanation:
    // ("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"?) -> Captures strings, optionally unclosed at the end
    // (-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)       -> Captures numbers
    // (true|false|null)                        -> Captures keywords
    // ([{}[\],:])                              -> Captures punctuation
    const tokenRegex = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"?)|(-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)|(true|false|null)|([{}[\],:])/g;

    let result = '';
    let lastIndex = 0;
    let match;

    while ((match = tokenRegex.exec(json)) !== null) {
        // Add any non-matching text (whitespace/invalid) as-is
        if (match.index > lastIndex) {
            result += json.substring(lastIndex, match.index);
        }

        const token = match[0];
        
        // 1. Strings (Key or Value determination is context-based, but here we do simple check)
        // Note: In strict JSON, keys are strings followed by :, but since we separated colon,
        // we can't easily distinguish keys just by regex lookahead safely without lookbehind support.
        // However, for visual highlighting, colouring all strings consistently is often acceptable 
        // or we can try to peek ahead.
        if (token.startsWith('"')) {
            // Simple heuristic: If the NEXT non-whitespace char is ':', treat as key
            const remaining = json.substring(tokenRegex.lastIndex);
            if (/^\s*:/.test(remaining)) {
                result += `${theme.syntax.key}${token}${ANSI.RESET}`;
            } else {
                result += `${theme.syntax.string}${token}${ANSI.RESET}`;
            }
        }
        // 2. Numbers
        else if (/^-?\d/.test(token)) {
             result += `${theme.syntax.number}${token}${ANSI.RESET}`;
        }
        // 3. Booleans/Null
        else if (/^(true|false|null)$/.test(token)) {
            if (token === 'null') {
                result += `${theme.syntax.null}${token}${ANSI.RESET}`;
            } else {
                result += `${theme.syntax.boolean}${token}${ANSI.RESET}`;
            }
        }
        // 4. Punctuation
        else if (/^[{}[\],:]$/.test(token)) {
            result += `${theme.syntax.punctuation}${token}${ANSI.RESET}`;
        }
        // Fallback
        else {
            result += token;
        }

        lastIndex = tokenRegex.lastIndex;
    }

    // Append remaining text
    if (lastIndex < json.length) {
        result += json.substring(lastIndex);
    }

    return result;
}