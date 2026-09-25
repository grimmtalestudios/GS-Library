import { colourOr, isDarkGround, lightnessOf, pushToContrast, withLightness } from './colour.js';
import { finishFor } from './finishes.js';
import { accentPartner, ACCENTS, groundSet } from './palette.js';
export const TEXT_KEYS = ['ink', 'muted', 'faint', 'title'];
const INK = {
    ink: '#ece4d0',
    muted: '#a89f89',
    faint: '#8a8172'
};
const INK_ON_PALE = {
    ink: '#1d1a15',
    muted: '#5d564a',
    faint: '#6e6659'
};
const INK_TARGETS = {
    ink: 11,
    muted: 6.5,
    faint: 4.5
};
const LADDER_STEP = 0.045;
const PANEL_WHITE = '236, 228, 208';
const PANEL_BLACK = '29, 26, 21';
const SEMANTIC = {
    good: '#7ea36f',
    warn: '#c9a24a',
    bad: '#c9553f'
};
const SEMANTIC_TARGET = 3;
const TITLE_INK = '#ece4d0';
function isBehind(a, b, away) {
    return (lightnessOf(a) - lightnessOf(b)) * away < LADDER_STEP;
}
function inkLadder(bg, isDark) {
    const base = isDark ? INK : INK_ON_PALE;
    const away = isDark ? 1 : -1;
    const faint = pushToContrast(base.faint, bg, INK_TARGETS.faint);
    let muted = pushToContrast(base.muted, bg, INK_TARGETS.muted);
    let ink = pushToContrast(base.ink, bg, INK_TARGETS.ink);
    // Pushing faint far can bring it within LADDER_STEP of muted
    if (isBehind(muted, faint, away)) {
        muted = withLightness(muted, lightnessOf(faint) + LADDER_STEP * away);
    }
    if (isBehind(ink, muted, away)) {
        ink = withLightness(ink, lightnessOf(muted) + LADDER_STEP * away);
    }
    return {
        ink,
        muted,
        faint
    };
}
export function buildTokens(appearance = {}) {
    const ground = groundSet(appearance.ground);
    const accent = colourOr(appearance.accent, ACCENTS.blood.value);
    const bg = ground.bg;
    const isDark = isDarkGround(bg);
    const ladder = inkLadder(bg, isDark);
    const isSeeThrough = finishFor(appearance.finish, isDark).alpha < 1;
    const panel = (alpha) => `rgba(${isDark ? PANEL_WHITE : PANEL_BLACK}, ${alpha})`;
    return {
        '--gs-bg': bg,
        '--gs-bg-alt': ground.bgAlt,
        // Stacked translucent grounds look opaque
        '--gs-surface': isSeeThrough ? 'transparent' : bg,
        '--gs-surface-alt': isSeeThrough ? panel(0.06) : ground.bgAlt,
        '--gs-panel': panel(0.04),
        '--gs-panel-raised': panel(0.07),
        '--gs-panel-hover': panel(0.11),
        '--gs-line': panel(0.12),
        '--gs-line-strong': panel(0.22),
        '--gs-ink': colourOr(appearance.ink, ladder.ink),
        '--gs-muted': colourOr(appearance.muted, ladder.muted),
        '--gs-faint': colourOr(appearance.faint, ladder.faint),
        '--gs-accent': accent,
        '--gs-accent-strong': accentPartner(accent, bg),
        '--gs-good': pushToContrast(SEMANTIC.good, bg, SEMANTIC_TARGET),
        '--gs-warn': pushToContrast(SEMANTIC.warn, bg, SEMANTIC_TARGET),
        '--gs-bad': pushToContrast(SEMANTIC.bad, bg, SEMANTIC_TARGET),
        '--gs-header': ground.header,
        '--gs-header-surface': isSeeThrough ? 'rgba(0, 0, 0, 0.28)' : ground.header,
        '--gs-title': colourOr(appearance.title, TITLE_INK)
    };
}
