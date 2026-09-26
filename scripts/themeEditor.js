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
const WINDOW_ID = `${MODULE_ID}-theme`;
const ICON = 'fa-solid fa-palette';
const TEMPLATE = `modules/${MODULE_ID}/templates/theme-editor.hbs`;
const BASE_SWATCHES = Object.values(GROUNDS).map(({ label, bg }) => ({
    label,
    colour: bg
}));
const ACCENT_SWATCHES = Object.values(ACCENTS).map(({ label, value }) => ({
    label,
    colour: value
}));
const loc = createLocalizer('GRIMMTALE.theme');
const log = createLogger(MODULE_ID);
const frameTheme = createTheme(MODULE_ID);
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
function getTheme() {
    return toLook(resolveAppearance());
}
async function writeTheme(patch) {
    if (game.user.isGM && !hasUserOverride()) {
        return setAppearance(patch, { scope: 'world' });
    }
    return setAppearance({
        ...patch,
        enabled: true
    });
}
function swatchGroup(picks, labels, swatches, current) {
    return {
        picks,
        legend: loc(`${labels}.legend`),
        custom: loc(`${labels}.custom`),
        value: current,
        isCustom: !swatches.some(({ colour }) => colour === current),
        swatches: swatches.map((swatch) => ({
            ...swatch,
            active: swatch.colour === current
        }))
    };
}
function finishChoices(theme) {
    return Object.entries(finishesFor(isDarkGround(theme.ground))).map(([key, finish]) => ({
        key,
        label: finish.label,
        active: key === theme.finish
    }));
}
function textColourRows(theme) {
    const tokens = buildTokens(theme);
    return TEXT_KEYS.map((key) => ({
        key,
        label: loc(`text.${key}`),
        colour: tokens[`--gs-${key}`],
        isSet: Boolean(theme[key])
    }));
}
function scoreNote(theme, score) {
    if (score.failing) {
        return loc('score.weakest', { name: score.weakest });
    }
    return isSeeThrough(theme) ? loc('score.seeThrough') : '';
}
function scoreSummary(theme) {
    const score = scoreTokens(buildTokens(theme));
    return {
        value: score.score,
        verdict: score.verdict,
        label: loc(`score.${score.verdict}`),
        note: scoreNote(theme, score)
    };
}
function isSameTheme(a, b) {
    return Object.keys(a).every((key) => a[key] === b[key]);
}
function listSavedThemes(theme) {
    const finishes = finishesFor(true);
    return listPresets().map((saved) => ({
        ...saved,
        finishLabel: finishes[saved.finish].label,
        active: isSameTheme(toLook(saved), theme)
    }));
}
function getThemeNameField(root) {
    return root.querySelector('[name="themeName"]');
}
class ThemeEditor extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: WINDOW_ID,
        classes: ['gs-shared-base', 'gs-library-theme-editor'],
        window: {
            title: 'GRIMMTALE.theme.title',
            icon: ICON,
            resizable: false
        },
        position: {
            width: 380, // room for the five finishes on one row
            height: 'auto'
        },
        actions: {
            pickColour: ThemeEditor.onPickColour,
            pickFinish: ThemeEditor.onPickFinish,
            clearTextColour: ThemeEditor.onClearTextColour,
            loadTheme: ThemeEditor.onLoadTheme,
            saveTheme: ThemeEditor.onSaveTheme,
            deleteTheme: ThemeEditor.onDeleteTheme,
            reset: ThemeEditor.onReset
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
        const theme = getTheme();
        return {
            ...context,
            ...getFooterContext(MODULE_ID),
            swatchGroups: [
                swatchGroup('ground', 'base', BASE_SWATCHES, theme.ground),
                swatchGroup('accent', 'accent', ACCENT_SWATCHES, theme.accent)
            ],
            finishes: finishChoices(theme),
            textColours: textColourRows(theme),
            score: scoreSummary(theme),
            ownTheme: hasUserOverride(),
            savedThemes: listSavedThemes(theme),
            isDefault: isStudioDefault(theme)
        };
    }
    _onFirstRender(context, options) {
        super._onFirstRender(context, options);
        bindFrame(this, frameTheme);
    }
    _onRender(context, options) {
        super._onRender(context, options);
        for (const well of this.element.querySelectorAll('input[type="color"]')) {
            well.addEventListener('change', () => void this.save(well, () => writeTheme({
                [well.dataset.picks]: well.value
            })));
        }
        const ownTheme = this.element.querySelector('[name="ownTheme"]');
        ownTheme?.addEventListener('change', () => void this.save(ownTheme, () => setAppearance({
            enabled: ownTheme.checked
        })));
        getThemeNameField(this.element)?.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                void this.saveCurrentTheme(event.currentTarget);
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
    async saveCurrentTheme(control) {
        const field = getThemeNameField(this.element);
        const name = field?.value.trim();
        if (!name) {
            field?.focus();
            return;
        }
        await this.save(control, () => savePreset(name, getTheme()), 'saved.failed');
    }
    static onPickColour(_event, target) {
        const { picks, colour } = target.dataset;
        void this.save(target, () => writeTheme({ [picks]: colour }));
    }
    static onPickFinish(_event, target) {
        void this.save(target, () => writeTheme({ finish: target.dataset.finish }));
    }
    static onClearTextColour(_event, target) {
        void this.save(target, () => writeTheme({ [target.dataset.text]: '' }));
    }
    static onLoadTheme(_event, target) {
        const saved = listPresets().find((candidate) => candidate.id === target.dataset.saved);
        if (!saved) {
            return;
        }
        void this.save(target, () => writeTheme(toLook(saved)));
    }
    static onSaveTheme(_event, target) {
        void this.saveCurrentTheme(target);
    }
    static onDeleteTheme(_event, target) {
        void this.save(target, () => deletePreset(target.dataset.saved ?? ''), 'saved.failed');
    }
    static onReset(_event, target) {
        void this.save(target, () => writeTheme(toLook({})));
    }
}
// registerMenu creates a new instance per click
class ThemeMenu extends ApplicationV2 {
    render() {
        openThemeEditor();
        return this;
    }
}
export function registerThemeMenu() {
    game.settings.registerMenu(MODULE_ID, 'librarySettings', {
        name: 'GRIMMTALE.theme.menu',
        label: 'GRIMMTALE.theme.menuLabel',
        hint: 'GRIMMTALE.theme.menuHint',
        icon: ICON,
        type: ThemeMenu,
        restricted: false
    });
}
export function openThemeEditor() {
    const open = foundry.applications.instances.get(WINDOW_ID);
    if (open) {
        open.bringToFront();
        return open;
    }
    const app = new ThemeEditor();
    void app.render(true);
    return app;
}
