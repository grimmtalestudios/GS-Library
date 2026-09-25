import { MODULE_ID, PACKAGES_HOST } from './constants.js';
import { isPrimaryGM } from './gm.js';
import { bindInputMode } from './inputMode.js';
import { createLogger } from './logger.js';
import { getModuleTitle } from './moduleInfo.js';
import { readSetting, registerSettings, writeSetting } from './settings.js';
import { createTheme } from './theme.js';

interface PendingUpdate {
    id: string;
    title: string;
    installed: string;
    available: string;
}

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;

const log = createLogger(MODULE_ID);
const theme = createTheme(MODULE_ID);

export function registerUpdateSettings(): void {
    registerSettings(MODULE_ID, 'GRIMMTALE.settings', {
        updateCheck: {
            type: Boolean,
            default: true
        }
    });
    game.settings.register(MODULE_ID, 'updateCheckedAt', {
        scope: 'client',
        config: false,
        type: Number,
        default: 0
    });
    game.settings.register(MODULE_ID, 'updateDismissed', {
        scope: 'client',
        config: false,
        type: Object,
        default: {}
    });
}

// Internal tools that predate the GS- prefix require the library
export function isStudioModule(module: FoundryModule): boolean {
    return module.id.startsWith('GS-') || [...module.relationships.requires].some(({ id }) => id === MODULE_ID);
}

function getUpdateEndpoint(module: FoundryModule): string | null {
    if (!URL.canParse(module.manifest)) {
        return null;
    }

    const url = new URL(module.manifest);

    // Manifests on GitHub are development clones
    return url.hostname === PACKAGES_HOST ? url.href : null;
}

async function fetchVersion(url: string): Promise<string | null> {
    try {
        const response = await fetch(url, {
            cache: 'no-store',
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
        });

        if (!response.ok) {
            log.debug(`update check: ${url} answered ${response.status}`);

            return null;
        }

        const manifest = await response.json() as { version?: unknown };

        return typeof manifest.version === 'string' ? manifest.version : null;
    } catch (err) {
        log.debug(`update check: ${url} failed`, err);

        return null;
    }
}

async function findUpdate(module: FoundryModule): Promise<PendingUpdate | null> {
    const endpoint = getUpdateEndpoint(module);

    if (!endpoint) {
        return null;
    }

    const available = await fetchVersion(endpoint);

    if (!available || !foundry.utils.isNewerVersion(available, module.version)) {
        return null;
    }

    return {
        id: module.id,
        title: getModuleTitle(module.id),
        installed: module.version,
        available
    };
}

export async function collectUpdates(): Promise<PendingUpdate[]> {
    const modules = game.modules.filter((module) => module.active && isStudioModule(module));
    const updates = await Promise.all(modules.map(findUpdate));

    return updates
        .filter((update) => update !== null)
        .sort((a, b) => a.title.localeCompare(b.title));
}

function getDismissed(): Record<string, string> {
    return readSetting(MODULE_ID, 'updateDismissed', {});
}

// Keyed by version so skipping 1.1.3 reports 1.1.4
function isDismissed(update: PendingUpdate): boolean {
    return getDismissed()[update.id] === update.available;
}

async function dismissUpdates(updates: PendingUpdate[]): Promise<void> {
    const skipped = Object.fromEntries(updates.map((update) => [update.id, update.available]));

    await writeSetting(MODULE_ID, 'updateDismissed', {
        ...getDismissed(),
        ...skipped
    });
}

function updateSummary(count: number): string {
    return count === 1
        ? game.i18n.localize('GRIMMTALE.updates.bodyOne')
        : game.i18n.format('GRIMMTALE.updates.bodyMany', { count });
}

function updateRow(update: PendingUpdate): string {
    const installed = game.i18n.format('GRIMMTALE.updates.installed', { version: update.installed });
    const from = `<span class="gs-update-from">${installed}</span>`;

    return `<li><strong>${update.title}</strong> ${update.available} ${from}</li>`;
}

async function reportUpdates(updates: PendingUpdate[]): Promise<void> {
    const summary = `<p>${updateSummary(updates.length)}</p>`;
    const rows = `<ul class="gs-update-list">${updates.map(updateRow).join('')}</ul>`;
    const where = `<p class="gs-update-where">${game.i18n.localize('GRIMMTALE.updates.where')}</p>`;

    const answer = await foundry.applications.api.DialogV2.wait({
        window: {
            title: 'GRIMMTALE.updates.title',
            icon: 'fa-solid fa-arrow-up-right-dots'
        },
        classes: ['gs-shared-base', 'gs-update-notice'],
        content: summary + rows + where,
        buttons: [
            {
                action: 'later',
                label: 'GRIMMTALE.updates.later',
                default: true
            },
            {
                action: 'dismiss',
                label: 'GRIMMTALE.updates.dismiss'
            }
        ],
        render: (_event: Event, dialog: { element: HTMLElement }) => {
            theme.apply(dialog);
            bindInputMode(dialog.element);
        },
        rejectClose: false
    });

    if (answer === 'dismiss') {
        await dismissUpdates(updates);
    }
}

function isCheckDue(): boolean {
    const checkedAt = readSetting(MODULE_ID, 'updateCheckedAt', 0);

    return readSetting(MODULE_ID, 'updateCheck', true) && isPrimaryGM() && Date.now() - checkedAt >= CHECK_INTERVAL_MS;
}

export async function checkForUpdates({ force = false } = {}): Promise<PendingUpdate[]> {
    if (!force && !isCheckDue()) {
        return [];
    }

    const found = await collectUpdates();

    // Written on failure too so an offline world doesn't retry every load
    await writeSetting(MODULE_ID, 'updateCheckedAt', Date.now());

    const reported = force ? found : found.filter((update) => !isDismissed(update));

    if (reported.length) {
        await reportUpdates(reported);
    }

    return found;
}
