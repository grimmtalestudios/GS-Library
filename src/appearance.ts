import { parseColour } from './colour.js';
import { MODULE_ID } from './constants.js';
import { DEFAULT_FINISH, isFinish } from './finishes.js';
import { ACCENTS, GROUNDS } from './palette.js';
import { readSetting, writeSetting } from './settings.js';
import { type Appearance, buildTokens } from './tokens.js';

interface ResolvedAppearance extends Required<Appearance> {
    modules: Record<string, string>;
}

interface AppearancePatch extends Partial<ResolvedAppearance> {
    enabled?: boolean;
}

interface Scope {
    scope?: 'user' | 'world';
}

export const THEMES = Object.freeze({
    dark: 'dark',
    base: 'base'
});

const FOLLOW = 'follow';

function isTheme(value: unknown): value is string {
    return value === THEMES.dark || value === THEMES.base;
}

function colourOr(value: unknown, fallback: string): string {
    return parseColour(value) ? String(value).toLowerCase() : fallback;
}

function groundOf(value: unknown): string {

    // Older settings store a key such as 'warm'
    const legacy = GROUNDS[value as keyof typeof GROUNDS] as { bg: string } | undefined;

    return legacy?.bg ?? colourOr(value, GROUNDS.warm.bg);
}

function themesOf(value: unknown): Record<string, string> {
    const stored = value && typeof value === 'object' ? Object.entries(value) : [];

    return Object.fromEntries(stored.filter(([, choice]) => isTheme(choice)));
}

export function toAppearance(raw: unknown): ResolvedAppearance {
    const value = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

    return {
        ground: groundOf(value.ground),
        accent: colourOr(value.accent, ACCENTS.blood.value),
        finish: isFinish(value.finish) ? String(value.finish) : DEFAULT_FINISH,
        ink: colourOr(value.ink, ''),
        muted: colourOr(value.muted, ''),
        faint: colourOr(value.faint, ''),
        title: colourOr(value.title, ''),
        modules: themesOf(value.modules)
    };
}

function getWorldAppearance(): ResolvedAppearance {
    return toAppearance(readSetting(MODULE_ID, 'appearance', {}));
}

export function getUserOverride(): ResolvedAppearance & { enabled: boolean } {
    const raw = readSetting<{ enabled?: unknown }>(MODULE_ID, 'appearanceOverride', {});

    return {
        enabled: Boolean(raw.enabled),
        ...toAppearance(raw)
    };
}

export function hasUserOverride(): boolean {
    return getUserOverride().enabled;
}

export function resolveAppearance(): ResolvedAppearance {
    const { enabled, ...override } = getUserOverride();

    return enabled ? override : getWorldAppearance();
}

export async function setAppearance(patch: AppearancePatch, { scope = 'user' }: Scope = {}): Promise<unknown> {
    if (scope === 'world') {
        return writeSetting(MODULE_ID, 'appearance', toAppearance({
            ...getWorldAppearance(),
            ...patch
        }));
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

export function resolveTheme(declared: string[] = Object.values(THEMES), moduleId?: string): string {
    const own = moduleId ? resolveAppearance().modules[moduleId] : undefined;

    if (own && declared.includes(own)) {
        return own;
    }

    return declared[0] ?? THEMES.dark;
}

export async function setModuleTheme(
    moduleId: string,
    choice: string,
    { scope = 'user' }: Scope = {}
): Promise<unknown> {
    const current = scope === 'world' ? getWorldAppearance() : getUserOverride();
    const modules = { ...current.modules };

    if (choice === FOLLOW) {
        delete modules[moduleId];
    } else {
        modules[moduleId] = choice;
    }

    return setAppearance({ modules }, { scope });
}

export function getCurrentTokens(): Record<string, string> {
    return buildTokens(resolveAppearance());
}
