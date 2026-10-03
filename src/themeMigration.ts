import { getUserOverride, setAppearance, THEMES } from './appearance.js';
import { MODULE_ID } from './constants.js';
import { createLogger } from './logger.js';
import { readSetting, writeSetting } from './settings.js';
import { isStudioModule } from './updates.js';

const MIGRATED = 'appearanceMigrated';

const log = createLogger(MODULE_ID);

export function registerMigrationSetting(): void {
    game.settings.register(MODULE_ID, MIGRATED, {
        scope: 'client',
        config: false,
        type: Boolean,
        default: false
    });
}

// Dark was every module's default
function wasOnBaseTheme(module: FoundryModule): boolean {

    // Rebuilt modules don't register their old client 'theme' setting
    const stored = game.settings.storage.get('client').getItem(`${module.id}.theme`);

    return module.active && isStudioModule(module) && stored === JSON.stringify(THEMES.base);
}

export function migrateLegacyThemes(): void {
    if (readSetting(MODULE_ID, MIGRATED, false)) {
        return;
    }

    const moduleIds = game.modules.filter(wasOnBaseTheme).map(({ id }) => id);

    if (moduleIds.length) {
        log.info(`carrying the base theme over from ${moduleIds.join(', ')}`);
        void setAppearance({
            enabled: true,
            modules: {
                ...getUserOverride().modules,
                ...Object.fromEntries(moduleIds.map((id) => [id, THEMES.base]))
            }
        });
    }

    void writeSetting(MODULE_ID, MIGRATED, true);
}
