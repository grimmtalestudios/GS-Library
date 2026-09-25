import { getCurrentTokens, resolveAppearance, resolveTheme, setAppearance, setModuleTheme, THEMES } from './appearance.js';
import { openAppearanceWindow, registerAppearanceMenu } from './appearanceWindow.js';
import { getOpenApps, getOpenAppsOf, openModuleSettings, refreshApps } from './apps.js';
import { auditTokens, scoreTokens } from './audit.js';
import { bootPhase, bootPhases, safeHook } from './boot.js';
import { contrast } from './colour.js';
import { bindCombatTurns, getCombatantToken, getViewedCombat } from './combat.js';
import { confirmDialog, getDialogV2, getDragData, getFilePicker, getFormDataExtended, getGeneration, getTextEditor, isAtLeast, toElement } from './compat.js';
import { getDiscord, getWebsite, MODULE_ID, STUDIO, STUDIO_DISCORD, STUDIO_SHORT, STUDIO_WEBSITE } from './constants.js';
import { findFirst, injectOnce, quietCloseButton } from './dom.js';
import { registerFonts } from './fonts.js';
import { bindFrame } from './frame.js';
import { getGMIds, getPrimaryGM, hasActiveGM, isPrimaryGM } from './gm.js';
import { createLocalizer } from './i18n.js';
import { bindInputMode } from './inputMode.js';
import { keyList } from './keyList.js';
import { createLogger } from './logger.js';
import { getFooterContext, getModuleTitle, getModuleVersion, getStudioFooter, isModuleActive, registerFooterHelper } from './moduleInfo.js';
import { createNotifier } from './notify.js';
import { ACCENTS, groundSet, GROUNDS } from './palette.js';
import { bindPeerReady, callPeer, getPeerApi, getPeerMethod, publishApi } from './peer.js';
import { deletePreset, listPresets, registerPresetSetting, savePreset } from './presets.js';
import { clearSaving, isSaving, markSaving, whileSaving } from './saving.js';
import { readSetting, registerSettings, writeSetting } from './settings.js';
import { fixSfxTriggers } from './shims.js';
import { applyAppearance, clearAppearance, refreshAppearance } from './stamp.js';
import { createTheme, registerAppearanceSettings } from './theme.js';
import { migrateLegacyThemes, registerMigrationSetting } from './themeMigration.js';
import { buildTokens } from './tokens.js';
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
    THEMES,
    createTheme,
    resolveAppearance,
    resolveTheme,
    applyAppearance,
    clearAppearance,
    refreshAppearance,
    setAppearance,
    currentTokens: getCurrentTokens,
    setModuleTheme,
    listPresets,
    savePreset,
    deletePreset,
    openLibrarySettings: openAppearanceWindow,
    GROUNDS,
    ACCENTS,
    groundSet,
    contrast,
    buildTokens,
    auditTokens,
    scoreTokens,
    findFirst,
    injectOnce,
    quietCloseButton,
    bindInputMode,
    bindFrame,
    clamp: Math.clamp,
    keyList,
    markSaving,
    clearSaving,
    isSaving,
    whileSaving,
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
    peerActive: isModuleActive,
    peerApi: getPeerApi,
    peerMethod: getPeerMethod,
    callPeer,
    onPeerReady: bindPeerReady,
    publishApi
});
// Set before init for other modules' init hooks
globalThis.Grimmtale = api;
Hooks.once('init', () => {
    bootPhases(log, {
        fonts: registerFonts,
        appearance: registerAppearanceSettings,
        presets: registerPresetSetting,
        migration: registerMigrationSetting,
        settingsMenu: registerAppearanceMenu,
        updates: registerUpdateSettings
    });
    log.info(`v${api.version} ready`);
    publishApi(MODULE_ID, api);
});
Hooks.once('ready', () => {
    // fixSfxTriggers inspects listeners other modules register during init
    bootPhase(log, 'shims', fixSfxTriggers);
    bootPhase(log, 'theme migration', migrateLegacyThemes);
    void checkForUpdates().catch((err) => log.debug('update check failed', err));
});
