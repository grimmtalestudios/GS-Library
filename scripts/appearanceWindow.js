import { hasUserOverride, resolveAppearance, setAppearance, toLook } from './appearance.js';
import { scoreTokens } from './audit.js';
import { isDarkGround } from './colour.js';
import { MODULE_ID } from './constants.js';
import { finishesFor } from './finishes.js';
import { bindFrame } from './frame.js';
import { createLocalizer } from './i18n.js';
import { createLogger } from './logger.js';
import { getFooterContext } from './moduleInfo.js';
import { ACCENTS, GROUNDS } from './palette.js';
import { deletePreset, listPresets, savePreset } from './presets.js';
import { whileSaving } from './saving.js';
import { isStudioDefault } from './stamp.js';
import { isSeeThrough } from './surface.js';
import { createTheme } from './theme.js';
import { buildTokens, TEXT_KEYS } from './tokens.js';
const WINDOW_ID = `${MODULE_ID}-appearance`;
const ICON = 'fa-solid fa-palette';
const TEMPLATE = `modules/${MODULE_ID}/templates/appearance.hbs`;
const GROUND_SWATCHES = Object.values(GROUNDS).map(({ label, bg }) => ({
    label,
    colour: bg
}));
const ACCENT_SWATCHES = Object.values(ACCENTS).map(({ label, value }) => ({
    label,
    colour: value
}));
const loc = createLocalizer('GRIMMTALE.settings');
const log = createLogger(MODULE_ID);
const theme = createTheme(MODULE_ID);
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
function getLook() {
    return toLook(resolveAppearance());
}
async function writeLook(patch) {
    if (game.user.isGM && !hasUserOverride()) {
        return setAppearance(patch, { scope: 'world' });
    }
    return setAppearance({
        ...patch,
        enabled: true
    });
}
function swatchGroup(picks, swatches, current) {
    return {
        picks,
        legend: loc(`${picks}.legend`),
        custom: loc(`${picks}.custom`),
        value: current,
        isCustom: !swatches.some(({ colour }) => colour === current),
        swatches: swatches.map((swatch) => ({
            ...swatch,
            active: swatch.colour === current
        }))
    };
}
function finishChoices(look) {
    return Object.entries(finishesFor(isDarkGround(look.ground))).map(([key, finish]) => ({
        key,
        label: finish.label,
        active: key === look.finish
    }));
}
function textColourRows(look) {
    const tokens = buildTokens(look);
    return TEXT_KEYS.map((key) => ({
        key,
        label: loc(`text.${key}`),
        colour: tokens[`--gs-${key}`],
        isSet: Boolean(look[key])
    }));
}
function scoreNote(look, score) {
    if (score.failing) {
        return loc('score.weakest', { name: score.weakest });
    }
    return isSeeThrough(look) ? loc('score.seeThrough') : '';
}
function scoreSummary(look) {
    const score = scoreTokens(buildTokens(look));
    return {
        value: score.score,
        verdict: score.verdict,
        label: loc(`score.${score.verdict}`),
        note: scoreNote(look, score)
    };
}
function isSameLook(a, b) {
    return Object.keys(a).every((key) => a[key] === b[key]);
}
function listPresetChoices(look) {
    const finishes = finishesFor(true);
    return listPresets().map((preset) => ({
        ...preset,
        finishLabel: finishes[preset.finish].label,
        active: isSameLook(toLook(preset), look)
    }));
}
function getPresetNameField(root) {
    return root.querySelector('[name="presetName"]');
}
class AppearanceWindow extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: WINDOW_ID,
        classes: ['gs-shared-base', 'gs-library-appearance-window'],
        window: {
            title: 'GRIMMTALE.settings.title',
            icon: ICON,
            resizable: false
        },
        position: {
            width: 380, // room for the five finishes on one row
            height: 'auto'
        },
        actions: {
            pickColour: AppearanceWindow.onPickColour,
            pickFinish: AppearanceWindow.onPickFinish,
            clearTextColour: AppearanceWindow.onClearTextColour,
            applyPreset: AppearanceWindow.onApplyPreset,
            savePreset: AppearanceWindow.onSavePreset,
            deletePreset: AppearanceWindow.onDeletePreset,
            reset: AppearanceWindow.onReset
        }
    };
    static PARTS = {
        body: {
            template: TEMPLATE,
            scrollable: ['.gs-scroll']
        }
    };
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        const look = getLook();
        return {
            ...context,
            ...getFooterContext(MODULE_ID),
            swatchGroups: [
                swatchGroup('ground', GROUND_SWATCHES, look.ground),
                swatchGroup('accent', ACCENT_SWATCHES, look.accent)
            ],
            finishes: finishChoices(look),
            textColours: textColourRows(look),
            score: scoreSummary(look),
            ownLook: hasUserOverride(),
            presets: listPresetChoices(look),
            isDefault: isStudioDefault(look)
        };
    }
    _onFirstRender(context, options) {
        super._onFirstRender(context, options);
        bindFrame(this, theme);
    }
    _onRender(context, options) {
        super._onRender(context, options);
        for (const well of this.element.querySelectorAll('input[type="color"]')) {
            well.addEventListener('change', () => void this.save(well, () => writeLook({
                [well.dataset.picks]: well.value
            })));
        }
        const ownLook = this.element.querySelector('[name="ownLook"]');
        ownLook?.addEventListener('change', () => void this.save(ownLook, () => setAppearance({
            enabled: ownLook.checked
        })));
        getPresetNameField(this.element)?.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                void this.saveLookAsPreset(event.currentTarget);
            }
        });
    }
    async save(control, write, failure = 'saveFailed') {
        try {
            await whileSaving(control, write);
        }
        catch (err) {
            log.fail(loc(failure), err);
        }
        void this.render();
    }
    async saveLookAsPreset(control) {
        const field = getPresetNameField(this.element);
        const name = field?.value.trim();
        if (!name) {
            field?.focus();
            return;
        }
        await this.save(control, () => savePreset(name, getLook()), 'presetFailed');
    }
    static onPickColour(_event, target) {
        const { picks, colour } = target.dataset;
        void this.save(target, () => writeLook({ [picks]: colour }));
    }
    static onPickFinish(_event, target) {
        void this.save(target, () => writeLook({ finish: target.dataset.finish }));
    }
    static onClearTextColour(_event, target) {
        void this.save(target, () => writeLook({ [target.dataset.text]: '' }));
    }
    static onApplyPreset(_event, target) {
        const preset = listPresets().find((candidate) => candidate.id === target.dataset.preset);
        if (!preset) {
            return;
        }
        void this.save(target, () => writeLook(toLook(preset)));
    }
    static onSavePreset(_event, target) {
        void this.saveLookAsPreset(target);
    }
    static onDeletePreset(_event, target) {
        void this.save(target, () => deletePreset(target.dataset.preset ?? ''), 'presetFailed');
    }
    static onReset(_event, target) {
        void this.save(target, () => writeLook(toLook({})));
    }
}
// registerMenu creates a new instance per click
class AppearanceMenu extends ApplicationV2 {
    render() {
        openAppearanceWindow();
        return this;
    }
}
export function registerAppearanceMenu() {
    game.settings.registerMenu(MODULE_ID, 'librarySettings', {
        name: 'GRIMMTALE.settings.menuName',
        label: 'GRIMMTALE.settings.menuLabel',
        hint: 'GRIMMTALE.settings.menuHint',
        icon: ICON,
        type: AppearanceMenu,
        restricted: false
    });
}
export function openAppearanceWindow() {
    const open = foundry.applications.instances.get(WINDOW_ID);
    if (open) {
        open.bringToFront();
        return open;
    }
    const app = new AppearanceWindow();
    void app.render(true);
    return app;
}
