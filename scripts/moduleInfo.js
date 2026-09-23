import { STUDIO, STUDIO_DISCORD, STUDIO_WEBSITE } from './constants.js';
export function getModuleVersion(moduleId) {
    return game.modules.get(moduleId)?.version ?? '';
}
export function getModuleTitle(moduleId, fallback) {
    return game.modules.get(moduleId)?.title ?? fallback ?? moduleId;
}
export function isModuleActive(moduleId) {
    return Boolean(game.modules.get(moduleId)?.active);
}
export function getStudioFooter(moduleId, title) {
    const name = getModuleTitle(moduleId, title);
    const version = getModuleVersion(moduleId);
    return version ? `${STUDIO} - ${name} v${version}` : `${STUDIO} - ${name}`;
}
export function getFooterContext(moduleId, title) {
    return {
        footer: getStudioFooter(moduleId, title),
        website: STUDIO_WEBSITE,
        discord: STUDIO_DISCORD
    };
}
export function registerFooterHelper(helperName = 'grimmtaleFooter') {
    // With no title, Handlebars passes its options object in its place
    Handlebars.registerHelper(helperName, (moduleId, title) => getStudioFooter(moduleId, typeof title === 'string' ? title : undefined));
}
