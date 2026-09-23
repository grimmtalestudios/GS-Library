import { MODULE_ID } from './constants.js';

interface Appearance {
    enabled?: boolean;
    modules?: Record<string, unknown>;
}

interface ThemeController {
    apply(app: { element: HTMLElement }): void;
    applyTo(element: HTMLElement): void;
}

const THEMES = ['dark', 'base'];

function getAppearance(): Appearance {
    const override = game.settings.get(MODULE_ID, 'appearanceOverride') as Appearance;

    return override.enabled ? override : game.settings.get(MODULE_ID, 'appearance') as Appearance;
}

function resolveTheme(moduleId: string): string {
    const own = getAppearance().modules?.[moduleId];

    return typeof own === 'string' && THEMES.includes(own) ? own : THEMES[0];
}

function stampTheme(element: HTMLElement, moduleId: string): void {
    element.dataset.theme = resolveTheme(moduleId);
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
