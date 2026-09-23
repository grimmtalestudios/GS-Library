import { resolveTheme, THEMES } from './appearance.js';
import { MODULE_ID } from './constants.js';
function stampTheme(element, moduleId) {
    element.dataset.theme = resolveTheme([THEMES.dark, THEMES.base], moduleId);
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
