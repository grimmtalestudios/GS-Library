import { resolveAppearance, resolveTheme, setAppearance, THEMES } from './appearance.js';
import { MODULE_ID } from './constants.js';
import { applyAppearance, refreshAppearance } from './stamp.js';
const ICONS = {
    [THEMES.dark]: 'fa-solid fa-moon',
    [THEMES.base]: 'fa-solid fa-scroll'
};
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
export function createTheme(moduleId, options = {}) {
    const { themes = [THEMES.dark, THEMES.base], labelFor, iconFor } = options;
    const current = () => resolveTheme(themes, moduleId);
    const getNext = () => {
        const theme = current();
        return themes.find((candidate) => candidate !== theme) ?? theme;
    };
    return {
        current,
        apply: (app) => applyAppearance(app.element, {
            themes,
            moduleId
        }),
        applyTo: (element, { overlay = false } = {}) => applyAppearance(element, {
            themes,
            moduleId,
            overlay
        }),
        // We skip the backdrop blur over the canvas, where it repaints every frame
        applyToOverlay: (element) => applyAppearance(element, {
            themes,
            moduleId,
            overlay: true
        }),
        // The toggle saves this user's choice, not the world's
        toggle: async () => {
            const next = getNext();
            if (next === current()) {
                return undefined;
            }
            return setAppearance({
                enabled: true,
                modules: {
                    ...resolveAppearance().modules,
                    [moduleId]: next
                }
            });
        },
        context: () => {
            const next = getNext();
            return {
                theme: current(),
                next,
                icon: iconFor?.(next) ?? ICONS[next] ?? '',
                label: labelFor?.(next) ?? ''
            };
        }
    };
}
