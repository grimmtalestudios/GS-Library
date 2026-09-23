import { isDarkGround, parseColour } from './colour.js';
import { finishFor } from './finishes.js';
import { groundSet } from './palette.js';
export function toTranslucent(hex, alpha) {
    const rgb = parseColour(hex);
    return rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})` : hex;
}
export function isSeeThrough(appearance) {
    return finishFor(appearance.finish, true).alpha < 1;
}
export function buildSurface(appearance, canBlur) {
    const ground = groundSet(appearance.ground);
    const finish = finishFor(appearance.finish, isDarkGround(ground.bg));
    const isClear = finish.alpha < 1;
    const headerAlpha = Math.round((1 + finish.alpha) * 50) / 100; // the header doesn't overlap the content
    return {
        content: {
            'background-color': isClear ? toTranslucent(ground.bg, finish.alpha) : '',
            'background-image': finish.image,
            'backdrop-filter': canBlur ? finish.backdrop : ''
        },
        header: isClear ? toTranslucent(ground.header, headerAlpha) : ''
    };
}
