import { hasUserOverride, PALETTE_MAX, resolveAppearance, setAppearance, toLook } from './appearance.js';
import { scoreTokens } from './audit.js';
import { isDarkGround } from './colour.js';
import { MODULE_ID } from './constants.js';
import { finishesFor } from './finishes.js';
import { bindFrame } from './frame.js';
import { createLocalizer } from './i18n.js';
import { createLogger } from './logger.js';
import { getFooterContext } from './moduleInfo.js';
import { deletePreset, listPresets, savePreset } from './presets.js';
import { whileSaving } from './saving.js';
import { isStudioDefault } from './stamp.js';
import { createTheme } from './theme.js';
import { buildTokens, TEXT_KEYS } from './tokens.js';
const WINDOW_ID = `${MODULE_ID}-theme`;
const ICON = 'fa-solid fa-palette';
const TEMPLATE = `modules/${MODULE_ID}/templates/theme-editor.hbs`;
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
async function writePalette(kind, colours, active) {
    return writeTheme({
        [kind]: active,
        palette: {
            ...resolveAppearance().palette,
            [kind]: colours
        }
    });
}
async function changeSwatch(kind, index, colour) {
    const colours = resolveAppearance().palette[kind].map((current, at) => (at === index ? colour : current));
    return writePalette(kind, colours, colour);
}
async function addSwatch(kind) {
    const appearance = resolveAppearance();
    return writePalette(kind, [...appearance.palette[kind], appearance[kind]], appearance[kind]);
}
async function deleteSwatch(kind, index) {
    const appearance = resolveAppearance();
    const colours = appearance.palette[kind].filter((_colour, at) => at !== index);
    const active = colours.includes(appearance[kind]) ? appearance[kind] : colours[0];
    return writePalette(kind, colours, active);
}
function paletteGroup(kind, labels, appearance) {
    const colours = appearance.palette[kind];
    return {
        kind,
        legend: loc(`${labels}.legend`),
        add: loc(`${labels}.add`),
        canAdd: colours.length < PALETTE_MAX,
        canDelete: colours.length > 1,
        swatches: colours.map((colour, index) => ({
            colour,
            index,
            active: colour === appearance[kind]
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
function scoreSummary(theme) {
    const score = scoreTokens(buildTokens(theme));
    return {
        value: score.score,
        verdict: score.verdict,
        label: loc(`score.${score.verdict}`)
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
            addSwatch: ThemeEditor.onAddSwatch,
            deleteSwatch: ThemeEditor.onDeleteSwatch,
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
        const appearance = resolveAppearance();
        const theme = toLook(appearance);
        return {
            ...context,
            ...getFooterContext(MODULE_ID),
            paletteGroups: [
                paletteGroup('ground', 'base', appearance),
                paletteGroup('accent', 'accent', appearance)
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
        this.bindSwatches();
        this.bindTextColours();
        this.bindOwnTheme();
        this.bindThemeName();
    }
    bindSwatches() {
        for (const swatch of this.element.querySelectorAll('.gs-library-theme-swatch')) {
            const kind = swatch.dataset.kind;
            const index = Number(swatch.dataset.index);
            swatch.addEventListener('click', (event) => {
                if (swatch.ariaCurrent === 'true') {
                    return;
                }
                // Skip the colour picker until the swatch is picked
                event.preventDefault();
                void this.save(swatch, () => writeTheme({ [kind]: swatch.value }));
            });
            swatch.addEventListener('change', () => {
                void this.save(swatch, () => changeSwatch(kind, index, swatch.value));
            });
        }
    }
    bindTextColours() {
        for (const well of this.element.querySelectorAll('.gs-library-theme-text > input')) {
            well.addEventListener('change', () => void this.save(well, () => writeTheme({
                [well.dataset.picks]: well.value
            })));
        }
    }
    bindOwnTheme() {
        const ownTheme = this.element.querySelector('[name="ownTheme"]');
        ownTheme?.addEventListener('change', () => void this.save(ownTheme, () => setAppearance({
            enabled: ownTheme.checked
        })));
    }
    bindThemeName() {
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
    static onAddSwatch(_event, target) {
        void this.save(target, () => addSwatch(target.dataset.kind));
    }
    static onDeleteSwatch(_event, target) {
        const { kind, index } = target.dataset;
        void this.save(target, () => deleteSwatch(kind, Number(index)));
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
