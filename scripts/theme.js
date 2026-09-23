import { MODULE_ID } from './constants.js';
import { applyAppearance, refreshAppearance } from './stamp.js';
export function registerAppearanceSettings() {
    for (const [key, scope] of [['appearance', 'world'], ['appearanceOverride', 'client']]) {
        game.settings.register(MODULE_ID, key, {
            scope,
            config: false,
            type: Object,
            default: {},
            onChange: refreshAppearance
        });
    }
}
export function createTheme(moduleId) {
    return {
        apply: (app) => applyAppearance(app.element, { moduleId }),
        applyTo: (element, { overlay = false } = {}) => applyAppearance(element, {
            moduleId,
            overlay
        }),
        // We skip the backdrop blur over the canvas, where it repaints every frame
        applyToOverlay: (element) => applyAppearance(element, {
            moduleId,
            overlay: true
        })
    };
}
