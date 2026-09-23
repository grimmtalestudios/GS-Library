import { getOpenApps, getOpenAppsOf, openModuleSettings, refreshApps } from './apps.js';
import { bootPhase, bootPhases, safeHook } from './boot.js';
import { clamp } from './clamp.js';
import { bindCombatTurns, getCombatantToken, getViewedCombat } from './combat.js';
import {
    confirmDialog,
    getDialogV2,
    getDragData,
    getFilePicker,
    getFormDataExtended,
    getGeneration,
    getTextEditor,
    isAtLeast,
    toElement
} from './compat.js';
import {
    getDiscord,
    getWebsite,
    MODULE_ID,
    STUDIO,
    STUDIO_DISCORD,
    STUDIO_SHORT,
    STUDIO_WEBSITE
} from './constants.js';
import { findFirst, injectOnce, quietCloseButton } from './dom.js';
import { registerFonts } from './fonts.js';
import { getGMIds, getPrimaryGM, hasActiveGM, isPrimaryGM } from './gm.js';
import { createLocalizer } from './i18n.js';
import { keyList } from './keyList.js';
import { createLogger } from './logger.js';
import {
    getFooterContext,
    getModuleTitle,
    getModuleVersion,
    getStudioFooter,
    isModuleActive,
    registerFooterHelper
} from './moduleInfo.js';
import { createNotifier } from './notify.js';
import { bindPeerReady, callPeer, getPeerApi, getPeerMethod, isPeerActive, publishApi } from './peer.js';
import { readSetting, registerSettings, writeSetting } from './settings.js';
import { createTheme, registerAppearanceSettings } from './theme.js';
import { checkForUpdates, collectUpdates, isStudioModule, registerUpdateSettings } from './updates.js';

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
    generation: getGeneration,
    atLeast: isAtLeast,
    textEditor: getTextEditor,
    renderTemplate: foundry.applications.handlebars.renderTemplate,
    loadTemplates: foundry.applications.handlebars.loadTemplates,
    getDragData,
    dialogV2: getDialogV2,
    confirmDialog,
    filePicker: getFilePicker,
    formDataExtended: getFormDataExtended,
    toElement,
    createLogger,
    bootPhase,
    bootPhases,
    safeHook,
    onCombatTurnChange: bindCombatTurns,
    viewedCombat: getViewedCombat,
    combatantToken: getCombatantToken,
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
    keyList,
    openApps: getOpenApps,
    openAppsOf: getOpenAppsOf,
    refreshApps,
    openModuleSettings,
    readSetting,
    writeSetting,
    registerSettings,
    checkForUpdates,
    collectUpdates,
    isStudioModule,
    peerActive: isPeerActive,
    peerApi: getPeerApi,
    peerMethod: getPeerMethod,
    callPeer,
    onPeerReady: bindPeerReady,
    publishApi
});

declare global {
    var Grimmtale: typeof api;
}

// Set before init for other modules' init hooks
globalThis.Grimmtale = api;

Hooks.once('init', () => {
    const module = game.modules.get(MODULE_ID);
    if (module) {
        module.api = api;
    }

    bootPhases(log, {
        fonts: () => registerFonts(MODULE_ID),
        appearance: registerAppearanceSettings,
        updates: registerUpdateSettings
    });
    log.info(`v${api.version} ready`);
    Hooks.callAll(`${MODULE_ID}.ready`, api);
});

Hooks.once('ready', () => {
    void checkForUpdates().catch((err: unknown) => log.debug('update check failed', err));
});
