import { resolveAppearance, resolveTheme } from './appearance.js';
import { DEFAULT_FINISH } from './finishes.js';
import { ACCENTS, GROUNDS } from './palette.js';
import { buildSurface, isSeeThrough } from './surface.js';
import { type Appearance, buildTokens } from './tokens.js';

interface StampOptions {
    themes?: string[];
    moduleId?: string;
    theme?: string;
    overlay?: boolean;
}

const STAMPED = '[data-gs-appearance], [data-gs-themes], [data-gs-module], [data-gs-overlay]';
const TEXT_KEYS = ['ink', 'muted', 'faint', 'title'] as const;

function isStudioDefault(appearance: Required<Appearance>): boolean {
    return appearance.ground === GROUNDS.warm.bg
        && appearance.accent === ACCENTS.blood.value
        && appearance.finish === DEFAULT_FINISH
        && TEXT_KEYS.every((key) => !appearance[key]);
}

function writeStyles(element: HTMLElement, key: 'gsAppearance' | 'gsSurface', styles: Record<string, string>): void {
    const written = Object.entries(styles).filter(([, value]) => value);

    for (const [name, value] of written) {
        element.style.setProperty(name, value);
    }

    if (written.length) {
        element.dataset[key] = written.map(([name]) => name).join(' ');
    }
}

function removeStyles(element: HTMLElement, key: 'gsAppearance' | 'gsSurface'): void {
    for (const name of element.dataset[key]?.split(' ') ?? []) {
        element.style.removeProperty(name);
    }

    delete element.dataset[key];
}

function markElement(element: HTMLElement, theme: string, { themes, moduleId, overlay }: StampOptions): void {
    element.dataset.theme = theme;

    if (themes?.length) {
        element.dataset.gsThemes = themes.join(' ');
    }

    if (moduleId) {
        element.dataset.gsModule = moduleId;
    }

    if (overlay) {
        element.dataset.gsOverlay = '';
    }
}

function dressElement(root: HTMLElement, appearance: Required<Appearance>, overlay: boolean): void {
    const tokens = buildTokens(appearance);
    const surface = buildSurface(appearance, !overlay);
    const content = root.querySelector<HTMLElement>(':scope > .window-content');
    const header = root.querySelector<HTMLElement>(':scope > .window-header');

    // Core's opaque --background on .application covers a see-through ground
    const frame = { 'background-color': isSeeThrough(appearance) ? 'transparent' : '' };

    writeStyles(root, 'gsAppearance', content ? {
        ...tokens,
        ...frame
    } : {
        ...tokens,
        ...surface.content
    });

    if (content) {
        writeStyles(content, 'gsSurface', surface.content);
    }

    if (header) {
        writeStyles(header, 'gsSurface', {
            '--gs-ink': appearance.title ? tokens['--gs-title'] : '',
            'background-color': surface.header
        });
    }
}

export function clearAppearance(element: unknown): void {
    if (!(element instanceof HTMLElement)) {
        return;
    }

    removeStyles(element, 'gsAppearance');

    for (const dressed of element.querySelectorAll<HTMLElement>('[data-gs-surface]')) {
        removeStyles(dressed, 'gsSurface');
    }
}

export function applyAppearance(element: unknown, options: StampOptions = {}): string {
    const theme = options.theme ?? resolveTheme(options.themes, options.moduleId);

    if (!(element instanceof HTMLElement)) {
        return theme;
    }

    markElement(element, theme, options);
    clearAppearance(element);

    const appearance = resolveAppearance();

    if (!isStudioDefault(appearance)) {
        dressElement(element, appearance, options.overlay === true);
    }

    return theme;
}

function getStampOptions(element: HTMLElement): StampOptions {
    const themes = element.dataset.gsThemes?.split(' ').filter(Boolean);

    return {
        themes: themes?.length ? themes : undefined,
        moduleId: element.dataset.gsModule,
        overlay: element.dataset.gsOverlay !== undefined
    };
}

export function refreshAppearance(): number {
    const stamped = document.querySelectorAll<HTMLElement>(STAMPED);

    for (const element of stamped) {
        applyAppearance(element, getStampOptions(element));
    }

    Hooks.callAll('grimmtale.appearanceChanged', resolveAppearance());

    return stamped.length;
}
