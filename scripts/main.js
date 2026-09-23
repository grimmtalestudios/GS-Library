import { registerFonts } from './fonts.js';
import { createLocalizer } from './i18n.js';
import { createLogger } from './logger.js';
const MODULE_ID = 'GS-Library';
const log = createLogger(MODULE_ID);
const api = Object.freeze({
    get version() {
        return game.modules.get(MODULE_ID)?.version ?? '';
    },
    createLogger,
    createLocalizer
});
// Set before init for other modules' init hooks
globalThis.Grimmtale = api;
Hooks.once('init', () => {
    const module = game.modules.get(MODULE_ID);
    if (module) {
        module.api = api;
    }
    registerFonts(MODULE_ID);
    log.info(`v${api.version} ready`);
    Hooks.callAll(`${MODULE_ID}.ready`, api);
});
