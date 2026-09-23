import { clamp } from './clamp.js';
import { getDiscord, getWebsite, MODULE_ID, STUDIO, STUDIO_DISCORD, STUDIO_SHORT, STUDIO_WEBSITE } from './constants.js';
import { findFirst, injectOnce, quietCloseButton } from './dom.js';
import { registerFonts } from './fonts.js';
import { getGMIds, getPrimaryGM, hasActiveGM, isPrimaryGM } from './gm.js';
import { createLocalizer } from './i18n.js';
import { keyList } from './keyList.js';
import { createLogger } from './logger.js';
import { getFooterContext, getModuleTitle, getModuleVersion, getStudioFooter, isModuleActive, registerFooterHelper } from './moduleInfo.js';
import { createNotifier } from './notify.js';
import { createTheme, registerAppearanceSettings } from './theme.js';
const log = createLogger(MODULE_ID);
const api = Object.freeze({
    get version() {
        return getModuleVersion(MODULE_ID);
    },
    STUDIO,
    STUDIO_SHORT,
    STUDIO_WEBSITE,
    STUDIO_DISCORD,
    getWebsite,
    getDiscord,
    moduleVersion: getModuleVersion,
    moduleTitle: getModuleTitle,
    moduleActive: isModuleActive,
    studioFooter: getStudioFooter,
    footerContext: getFooterContext,
    registerFooterHelper,
    createLogger,
    createLocalizer,
    createNotifier,
    primaryGM: getPrimaryGM,
    isPrimaryGM,
    hasActiveGM,
    gmIds: getGMIds,
    createTheme,
    findFirst,
    injectOnce,
    quietCloseButton,
    clamp,
    keyList
});
// Set before init for other modules' init hooks
globalThis.Grimmtale = api;
Hooks.once('init', () => {
    const module = game.modules.get(MODULE_ID);
    if (module) {
        module.api = api;
    }
    registerFonts(MODULE_ID);
    registerAppearanceSettings();
    log.info(`v${api.version} ready`);
    Hooks.callAll(`${MODULE_ID}.ready`, api);
});
