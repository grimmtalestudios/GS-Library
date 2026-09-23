interface Rgb {
    r: number;
    g: number;
    b: number;
}

interface Hsl {
    h: number;
    s: number;
    l: number;
}

const SHORT_HEX = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i;
const FULL_HEX = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;

export function parseColour(value: unknown): Rgb | null {
    const text = String(value ?? '').trim();
    const short = SHORT_HEX.exec(text);
    const channels = short ? short.slice(1).map((digit) => digit + digit) : FULL_HEX.exec(text)?.slice(1);

    if (!channels) {
        return null;
    }

    const [r, g, b] = channels.map((channel) => parseInt(channel, 16));

    return {
        r,
        g,
        b
    };
}

function toChannelHex(value: number): string {
    return Math.round(Math.min(255, Math.max(0, value))).toString(16).padStart(2, '0');
}

export function toHex({ r, g, b }: Rgb): string {
    return `#${toChannelHex(r)}${toChannelHex(g)}${toChannelHex(b)}`;
}

function toLinear(channel: number): number {
    const c = channel / 255;

    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function luminance({ r, g, b }: Rgb): number {
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function contrast(a: string, b: string): number {
    const first = parseColour(a);
    const second = parseColour(b);

    if (!first || !second) {
        return 1; // lowest possible ratio, so a bad colour fails every target
    }

    const [dark, light] = [luminance(first), luminance(second)].sort((x, y) => x - y);

    return (light + 0.05) / (dark + 0.05);
}

function hueOf(red: number, green: number, blue: number): number {
    const max = Math.max(red, green, blue);
    const d = max - Math.min(red, green, blue);

    if (max === red) {
        return ((green - blue) / d + (green < blue ? 6 : 0)) / 6;
    }

    return max === green ? ((blue - red) / d + 2) / 6 : ((red - green) / d + 4) / 6;
}

function toHsl({ r, g, b }: Rgb): Hsl {
    const [red, green, blue] = [r / 255, g / 255, b / 255];
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const l = (max + min) / 2;

    if (max === min) {
        return {
            h: 0,
            s: 0,
            l
        };
    }

    const d = max - min;

    return {
        h: hueOf(red, green, blue),
        s: l > 0.5 ? d / (2 - max - min) : d / (max + min),
        l
    };
}

function hueToChannel(p: number, q: number, hue: number): number {
    const t = hue - Math.floor(hue);

    if (t < 1 / 6) {
        return p + (q - p) * 6 * t;
    }

    if (t < 1 / 2) {
        return q;
    }

    return t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p;
}

function toRgb({ h, s, l }: Hsl): Rgb {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    return {
        r: hueToChannel(p, q, h + 1 / 3) * 255,
        g: hueToChannel(p, q, h) * 255,
        b: hueToChannel(p, q, h - 1 / 3) * 255
    };
}

// Core's Color truncates channels and shifts colours saved in worlds
export function withLightness(hex: string, lightness: number): string {
    const rgb = parseColour(hex);

    if (!rgb) {
        return hex;
    }

    return toHex(toRgb({
        ...toHsl(rgb),
        l: Math.min(1, Math.max(0, lightness))
    }));
}

export function lightnessOf(hex: string): number {
    const rgb = parseColour(hex);

    return rgb ? toHsl(rgb).l : 0;
}

export function isDarkGround(hex: string): boolean {
    const rgb = parseColour(hex);

    return rgb ? luminance(rgb) < 0.18 : true;
}

export function pushToContrast(hex: string, ground: string, target: number): string {
    if (contrast(hex, ground) >= target) {
        return hex;
    }

    let far = isDarkGround(ground) ? 1 : 0;

    if (contrast(withLightness(hex, far), ground) < target) {
        return withLightness(hex, far);
    }

    let near = lightnessOf(hex);

    for (let i = 0; i < 12; i++) { // 12 halvings, finer than one 8-bit channel step
        const mid = (near + far) / 2;

        if (contrast(withLightness(hex, mid), ground) >= target) {
            far = mid;
        } else {
            near = mid;
        }
    }

    return withLightness(hex, far);
}
