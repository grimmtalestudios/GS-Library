import { toLook } from './appearance.js';
import { type Appearance, TEXT_KEYS } from './tokens.js';

const PREFIX = 'GSLOOK1:';
const LOOK_KEYS = ['ground', 'accent', 'finish', ...TEXT_KEYS];

export function toShareCode(appearance: Appearance): string {

    // Empty values mean follow the ground
    const chosen = Object.entries(toLook(appearance)).filter(([, value]) => value);

    return PREFIX + JSON.stringify(Object.fromEntries(chosen));
}

// Chat clients wrap inline code in backticks
function unwrap(code: string): string {
    const text = code.trim().replace(/^`+|`+$/g, '').trim();

    return text.startsWith(PREFIX) ? text.slice(PREFIX.length) : text;
}

function parseJson(text: string): unknown {
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

// toLook turns an object with no look keys into the studio look
function isLook(value: unknown): value is object {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
        && LOOK_KEYS.some((key) => key in value);
}

export function parseShareCode(code: string): Required<Appearance> | null {
    const parsed = parseJson(unwrap(code));

    return isLook(parsed) ? toLook(parsed) : null;
}
