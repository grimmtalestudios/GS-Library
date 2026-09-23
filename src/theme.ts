import { resolveTheme, THEMES } from './appearance.js';
import { MODULE_ID } from './constants.js';

interface ThemeController {
    apply(app: { element: HTMLElement }): void;
    applyTo(element: HTMLElement): void;
}

function stampTheme(element: HTMLElement, moduleId: string): void {
    element.dataset.theme = resolveTheme([THEMES.dark, THEMES.base], moduleId);
    element.dataset.gsModule = moduleId;
}

function restampThemes(): void {
    for (const element of document.querySelectorAll<HTMLElement>('[data-gs-module]')) {
        stampTheme(element, element.dataset.gsModule ?? '');
    }
}

export function registerAppearanceSettings(): void {
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

export function createTheme(moduleId: string): ThemeController {
    return {
        apply: (app) => stampTheme(app.element, moduleId),
        applyTo: (element) => stampTheme(element, moduleId)
    };
}
