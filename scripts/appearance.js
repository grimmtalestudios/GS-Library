import { colourOr } from './colour.js';
import { MODULE_ID } from './constants.js';
import { DEFAULT_FINISH, isFinish } from './finishes.js';
import { ACCENTS, GROUNDS } from './palette.js';
import { readSetting, writeSetting } from './settings.js';
import { buildTokens } from './tokens.js';
import { queueWrite } from './writeQueue.js';
export const THEMES = Object.freeze({
    dark: 'dark',
    base: 'base'
});
const FOLLOW = 'follow';
export const PALETTE_MAX = 10;
function isTheme(value) {
    return value === THEMES.dark || value === THEMES.base;
}
function groundOf(value) {
    // Older settings store a key such as 'warm'
    const legacy = GROUNDS[value];
    return legacy?.bg ?? colourOr(value, GROUNDS.warm.bg);
}
function themesOf(value) {
    const stored = value && typeof value === 'object' ? Object.entries(value) : [];
    return Object.fromEntries(stored.filter(([, choice]) => isTheme(choice)));
}
function coloursOf(value, active) {
    const stored = Array.isArray(value) ? value.map((colour) => colourOr(colour, '')).filter(Boolean) : [];
    const kept = stored.slice(0, PALETTE_MAX);
    const hasRoom = kept.length < PALETTE_MAX;
    // Don't drop a saved colour to make room for the active one
    return hasRoom && !kept.includes(active) ? [active, ...kept] : kept;
}
function paletteOf(value, ground, accent) {
    const stored = (value && typeof value === 'object' ? value : {});
    return {
        ground: coloursOf(stored.ground, ground),
        accent: coloursOf(stored.accent, accent)
    };
}
export function toAppearance(raw) {
    const value = (raw && typeof raw === 'object' ? raw : {});
    const ground = groundOf(value.ground);
    const accent = colourOr(value.accent, ACCENTS.blood.value);
    return {
        ground,
        accent,
        finish: isFinish(value.finish) ? String(value.finish) : DEFAULT_FINISH,
        ink: colourOr(value.ink, ''),
        muted: colourOr(value.muted, ''),
        faint: colourOr(value.faint, ''),
        title: colourOr(value.title, ''),
        modules: themesOf(value.modules),
        palette: paletteOf(value.palette, ground, accent)
    };
}
export function toLook(raw) {
    const { modules: _modules, palette: _palette, ...look } = toAppearance(raw);
    return look;
}
function getWorldAppearance() {
    return toAppearance(readSetting(MODULE_ID, 'appearance', {}));
}
function writeWorldAppearance(patch) {
    // game.settings.get returns the old value until the server responds
    return queueWrite(`${MODULE_ID}.appearance`, () => writeSetting(MODULE_ID, 'appearance', toAppearance({
        ...getWorldAppearance(),
        ...patch
    })));
}
export function getUserOverride() {
    const raw = readSetting(MODULE_ID, 'appearanceOverride', {});
    return {
        enabled: Boolean(raw.enabled),
        ...toAppearance(raw)
    };
}
export function hasUserOverride() {
    return getUserOverride().enabled;
}
export function resolveAppearance() {
    const { enabled, ...override } = getUserOverride();
    return enabled ? override : getWorldAppearance();
}
export async function setAppearance(patch, { scope = 'user' } = {}) {
    if (scope === 'world') {
        return writeWorldAppearance(patch);
    }
    const current = getUserOverride();
    // If the override is being switched on, start from the world appearance
    const base = patch.enabled === true && !current.enabled ? getWorldAppearance() : current;
    return writeSetting(MODULE_ID, 'appearanceOverride', {
        ...toAppearance({
            ...base,
            ...patch
        }),
        enabled: patch.enabled ?? current.enabled
    });
}
export function resolveTheme(declared = Object.values(THEMES), moduleId) {
    const own = moduleId ? resolveAppearance().modules[moduleId] : undefined;
    if (own && declared.includes(own)) {
        return own;
    }
    return declared[0] ?? THEMES.dark;
}
export async function setModuleTheme(moduleId, choice, { scope = 'user' } = {}) {
    const current = scope === 'world' ? getWorldAppearance() : getUserOverride();
    const modules = { ...current.modules };
    if (choice === FOLLOW) {
        delete modules[moduleId];
    }
    else {
        modules[moduleId] = choice;
    }
    return setAppearance({ modules }, { scope });
}
export function getCurrentTokens() {
    return buildTokens(resolveAppearance());
}
