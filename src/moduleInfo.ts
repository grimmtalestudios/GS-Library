import { STUDIO, STUDIO_DISCORD, STUDIO_WEBSITE } from './constants.js';

export function getModuleVersion(moduleId: string): string {
    return game.modules.get(moduleId)?.version ?? '';
}

export function getModuleTitle(moduleId: string, fallback?: string): string {
    return game.modules.get(moduleId)?.title ?? fallback ?? moduleId;
}

export function isModuleActive(moduleId: string): boolean {
    return Boolean(game.modules.get(moduleId)?.active);
}

export function getStudioFooter(moduleId: string, title?: string): string {
    const name = getModuleTitle(moduleId, title);
    const version = getModuleVersion(moduleId);

    return version ? `${STUDIO} - ${name} v${version}` : `${STUDIO} - ${name}`;
}

export function getFooterContext(moduleId: string, title?: string) {
    return {
        footer: getStudioFooter(moduleId, title),
        website: STUDIO_WEBSITE,
        discord: STUDIO_DISCORD
    };
}

export function registerFooterHelper(helperName = 'grimmtaleFooter'): void {

    // With no title, Handlebars passes its options object in its place
    Handlebars.registerHelper(helperName, (moduleId: string, title: unknown) =>
        getStudioFooter(moduleId, typeof title === 'string' ? title : undefined));
}
