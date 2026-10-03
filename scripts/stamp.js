import { resolveAppearance, resolveTheme } from './appearance.js';
import { DEFAULT_FINISH } from './finishes.js';
import { ACCENTS, GROUNDS } from './palette.js';
import { buildSurface, isSeeThrough } from './surface.js';
import { buildTokens, TEXT_KEYS } from './tokens.js';
const STAMPED = '[data-gs-appearance], [data-gs-themes], [data-gs-module], [data-gs-overlay]';
export function isStudioDefault(appearance) {
    return appearance.ground === GROUNDS.warm.bg
        && appearance.accent === ACCENTS.blood.value
        && appearance.finish === DEFAULT_FINISH
        && TEXT_KEYS.every((key) => !appearance[key]);
}
function writeStyles(element, key, styles) {
    const written = Object.entries(styles).filter(([, value]) => value);
    for (const [name, value] of written) {
        element.style.setProperty(name, value);
    }
    if (written.length) {
        element.dataset[key] = written.map(([name]) => name).join(' ');
    }
}
function removeStyles(element, key) {
    for (const name of element.dataset[key]?.split(' ') ?? []) {
        element.style.removeProperty(name);
    }
    delete element.dataset[key];
}
function markElement(element, theme, { themes, moduleId, overlay }) {
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
function dressElement(root, appearance, overlay) {
    const tokens = buildTokens(appearance);
    const surface = buildSurface(appearance, !overlay);
    const content = root.querySelector(':scope > .window-content');
    const header = root.querySelector(':scope > .window-header');
    // Core paints .application with --background, parchment in the light theme
    const frame = { background: isSeeThrough(appearance) ? 'transparent' : '' };
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
// Detached windows have a separate HTMLElement class
function isElement(value) {
    return value?.nodeType === Node.ELEMENT_NODE;
}
export function clearAppearance(element) {
    if (!isElement(element)) {
        return;
    }
    removeStyles(element, 'gsAppearance');
    for (const dressed of element.querySelectorAll('[data-gs-surface]')) {
        removeStyles(dressed, 'gsSurface');
    }
}
export function applyAppearance(element, options = {}) {
    const theme = options.theme ?? resolveTheme(options.themes, options.moduleId);
    if (!isElement(element)) {
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
function getStampOptions(element) {
    const themes = element.dataset.gsThemes?.split(' ').filter(Boolean);
    return {
        themes: themes?.length ? themes : undefined,
        moduleId: element.dataset.gsModule,
        overlay: element.dataset.gsOverlay !== undefined
    };
}
function findStampedElements() {
    const { detached } = foundry.applications; // v13 has no detached windows
    return detached?.querySelectorAll(STAMPED) ?? [...document.querySelectorAll(STAMPED)];
}
export function refreshAppearance() {
    const stamped = findStampedElements();
    for (const element of stamped) {
        applyAppearance(element, getStampOptions(element));
    }
    Hooks.callAll('grimmtale.appearanceChanged', resolveAppearance());
    return stamped.length;
}
