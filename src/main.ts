import { MODULE_ID } from './constants.js';
import { registerFonts } from './fonts.js';
import { createLocalizer } from './i18n.js';
import { createLogger } from './logger.js';
import { createNotifier } from './notify.js';
import { createTheme, registerAppearanceSettings } from './theme.js';

const log = createLogger(MODULE_ID);

const api = Object.freeze({
    get version() {
        return game.modules.get(MODULE_ID)?.version ?? '';
    },
    createLogger,
    createLocalizer,
    createNotifier,
    createTheme
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

    registerFonts(MODULE_ID);
    registerAppearanceSettings();
    log.info(`v${api.version} ready`);
    Hooks.callAll(`${MODULE_ID}.ready`, api);
});
