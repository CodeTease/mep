import { ANSI } from './ansi';

export function highlightJson(json: string): string {
    if (!json) return '';
    
    // Regex for JSON tokens
    // Captures:
    // 1. Strings (potentially keys if followed by :)
    // 2. Numbers
    // 3. Booleans/Null
    // 4. Punctuation
    
    const tokenRegex = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?)|(-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)|(true|false|null)|([{}\[\],:])/g;

    return json.replace(tokenRegex, (match) => {
        // String
        if (match.startsWith('"')) {
            // Check if it's a key (ends with :)
            if (match.trim().endsWith(':')) {
                const colonIndex = match.lastIndexOf(':');
                const keyPart = match.substring(0, colonIndex);
                const colonPart = match.substring(colonIndex);
                // Key in Cyan
                return `${ANSI.FG_CYAN}${keyPart}${ANSI.RESET}${colonPart}`;
            }
            // String value in Green
            return `${ANSI.FG_GREEN}${match}${ANSI.RESET}`;
        }
        
        // Number in Yellow
        if (/^-?\d/.test(match)) {
             return `${ANSI.FG_YELLOW}${match}${ANSI.RESET}`;
        }
        
        // Boolean/Null in Red (or Magenta if available, using Red for now)
        if (/^(true|false|null)$/.test(match)) {
            return `${ANSI.FG_RED}${match}${ANSI.RESET}`;
        }
        
        // Punctuation in White (or default)
        return `${ANSI.FG_WHITE}${match}${ANSI.RESET}`;
    });
}
