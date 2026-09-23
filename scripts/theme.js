import { MODULE_ID } from './constants.js';
const THEMES = ['dark', 'base'];
function getAppearance() {
    const override = game.settings.get(MODULE_ID, 'appearanceOverride');
    return override.enabled ? override : game.settings.get(MODULE_ID, 'appearance');
}
function resolveTheme(moduleId) {
    const own = getAppearance().modules?.[moduleId];
    return typeof own === 'string' && THEMES.includes(own) ? own : THEMES[0];
}
function stampTheme(element, moduleId) {
    element.dataset.theme = resolveTheme(moduleId);
    element.dataset.gsModule = moduleId;
}
function restampThemes() {
    for (const element of document.querySelectorAll('[data-gs-module]')) {
        stampTheme(element, element.dataset.gsModule ?? '');
    }
}
export function registerAppearanceSettings() {
    for (const [key, scope] of [['appearance', 'world'], ['appearanceOverride', 'client']]) {
        game.settings.register(MODULE_ID, key, {
            scope,
            config: false,
            type: Object,
            default: {},
            onChange: restampThemes
        });
    }
}
export function createTheme(moduleId) {
    return {
        apply: (app) => stampTheme(app.element, moduleId),
        applyTo: (element) => stampTheme(element, moduleId)
    };
}
