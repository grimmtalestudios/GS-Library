import { colourOr, isDarkGround, lightnessOf, pushToContrast, withLightness } from './colour.js';
export const GROUNDS = Object.freeze({
    warm: {
        label: 'Warm black',
        bg: '#17150f',
        bgAlt: '#1f1c15',
        header: '#211d15'
    },
    deep: {
        label: 'Deep',
        bg: '#0f0c08',
        bgAlt: '#17130c',
        header: '#1a1610'
    },
    neutral: {
        label: 'Neutral',
        bg: '#161616',
        bgAlt: '#1e1e1e',
        header: '#202020'
    },
    cool: {
        label: 'Cool slate',
        bg: '#14161c',
        bgAlt: '#1c1f27',
        header: '#1e222b'
    }
});
export const ACCENTS = Object.freeze({
    blood: {
        label: 'Blood',
        value: '#c9553f',
        strong: '#e0765d'
    },
    ember: {
        label: 'Ember',
        value: '#e07a45',
        strong: '#e89b72'
    },
    brass: {
        label: 'Brass',
        value: '#c9a24a',
        strong: '#d5b773'
    },
    gold: {
        label: 'Gold',
        value: '#c9973f',
        strong: '#d5ad68'
    },
    moss: {
        label: 'Moss',
        value: '#7ea36f',
        strong: '#9bb88f'
    },
    sky: {
        label: 'Sky',
        value: '#8ab9d0',
        strong: '#b0d0df'
    }
});
function findDesignedGround(hex) {
    const bg = hex.toLowerCase();
    return Object.values(GROUNDS).find((ground) => ground.bg === bg);
}
function deriveGround(bg) {
    const l = lightnessOf(bg);
    const isDark = isDarkGround(bg);
    // Module stylesheets use pale ink in .window-header
    return {
        bg,
        bgAlt: withLightness(bg, isDark ? l + 0.035 : l - 0.045),
        header: withLightness(bg, Math.min(0.12, Math.max(0.055, isDark ? l + 0.03 : 0.085)))
    };
}
export function groundSet(hex) {
    const bg = colourOr(hex, GROUNDS.warm.bg);
    const designed = findDesignedGround(bg);
    if (!designed) {
        return deriveGround(bg);
    }
    return {
        bg: designed.bg,
        bgAlt: designed.bgAlt,
        header: designed.header
    };
}
const HOVER_LIFT = 0.104;
export function accentPartner(accent, bg) {
    const isDark = isDarkGround(bg);
    const preset = Object.values(ACCENTS).find((entry) => entry.value === accent.toLowerCase());
    // Preset partners were designed for dark grounds
    if (preset && isDark) {
        return preset.strong;
    }
    const moved = withLightness(accent, lightnessOf(accent) + (isDark ? HOVER_LIFT : -HOVER_LIFT));
    return pushToContrast(moved, bg, 4.5);
}
