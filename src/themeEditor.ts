import {
    type AppearancePatch,
    hasUserOverride,
    PALETTE_MAX,
    type ResolvedAppearance,
    resolveAppearance,
    setAppearance,
    toLook
} from './appearance.js';
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
import { type Appearance, buildTokens, TEXT_KEYS } from './tokens.js';

type Theme = Required<Appearance>;
type ColourKey = Exclude<keyof Theme, 'finish'>;
type PaletteKey = keyof ResolvedAppearance['palette'];

const WINDOW_ID = `${MODULE_ID}-theme`;
const ICON = 'fa-solid fa-palette';
const TEMPLATE = `modules/${MODULE_ID}/templates/theme-editor.hbs`;

const loc = createLocalizer('GRIMMTALE.theme');
const log = createLogger(MODULE_ID);
const frameTheme = createTheme(MODULE_ID);
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

function getTheme(): Theme {
    return toLook(resolveAppearance());
}

async function writeTheme(patch: AppearancePatch): Promise<unknown> {
    if (game.user.isGM && !hasUserOverride()) {
        return setAppearance(patch, { scope: 'world' });
    }

    return setAppearance({
        ...patch,
        enabled: true
    });
}

async function writePalette(kind: PaletteKey, colours: string[], active: string): Promise<unknown> {
    return writeTheme({
        [kind]: active,
        palette: {
            ...resolveAppearance().palette,
            [kind]: colours
        }
    });
}

async function changeSwatch(kind: PaletteKey, index: number, colour: string): Promise<unknown> {
    const colours = resolveAppearance().palette[kind].map((current, at) => (at === index ? colour : current));

    return writePalette(kind, colours, colour);
}

async function addSwatch(kind: PaletteKey): Promise<unknown> {
    const appearance = resolveAppearance();

    return writePalette(kind, [...appearance.palette[kind], appearance[kind]], appearance[kind]);
}

async function deleteSwatch(kind: PaletteKey, index: number): Promise<unknown> {
    const appearance = resolveAppearance();
    const colours = appearance.palette[kind].filter((_colour, at) => at !== index);
    const active = colours.includes(appearance[kind]) ? appearance[kind] : colours[0];

    return writePalette(kind, colours, active);
}

function paletteGroup(kind: PaletteKey, labels: string, appearance: ResolvedAppearance) {
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

function finishChoices(theme: Theme) {
    return Object.entries(finishesFor(isDarkGround(theme.ground))).map(([key, finish]) => ({
        key,
        label: finish.label,
        active: key === theme.finish
    }));
}

function textColourRows(theme: Theme) {
    const tokens = buildTokens(theme);

    return TEXT_KEYS.map((key) => ({
        key,
        label: loc(`text.${key}`),
        colour: tokens[`--gs-${key}`],
        isSet: Boolean(theme[key])
    }));
}

function scoreSummary(theme: Theme) {
    const score = scoreTokens(buildTokens(theme));

    return {
        value: score.score,
        verdict: score.verdict,
        label: loc(`score.${score.verdict}`)
    };
}

function isSameTheme(a: Theme, b: Theme): boolean {
    return Object.keys(a).every((key) => a[key as keyof Theme] === b[key as keyof Theme]);
}

function listSavedThemes(theme: Theme) {
    const finishes = finishesFor(true);

    return listPresets().map((saved) => ({
        ...saved,
        finishLabel: finishes[saved.finish].label,
        active: isSameTheme(toLook(saved), theme)
    }));
}

function getThemeNameField(root: HTMLElement): HTMLInputElement | null {
    return root.querySelector<HTMLInputElement>('[name="themeName"]');
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

    declare element: HTMLElement;

    async _prepareContext(options: unknown) {
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

    _onFirstRender(context: unknown, options: unknown): void {
        super._onFirstRender(context, options);
        bindFrame(this, frameTheme);
    }

    _onRender(context: unknown, options: unknown): void {
        super._onRender(context, options);
        this.bindSwatches();
        this.bindTextColours();
        this.bindOwnTheme();
        this.bindThemeName();
    }

    bindSwatches(): void {
        for (const swatch of this.element.querySelectorAll<HTMLInputElement>('.gs-library-theme-swatch')) {
            const kind = swatch.dataset.kind as PaletteKey;
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

    bindTextColours(): void {
        for (const well of this.element.querySelectorAll<HTMLInputElement>('.gs-library-theme-text > input')) {
            well.addEventListener('change', () => void this.save(well, () => writeTheme({
                [well.dataset.picks as ColourKey]: well.value
            })));
        }
    }

    bindOwnTheme(): void {
        const ownTheme = this.element.querySelector<HTMLInputElement>('[name="ownTheme"]');

        ownTheme?.addEventListener('change', () => void this.save(ownTheme, () => setAppearance({
            enabled: ownTheme.checked
        })));
    }

    bindThemeName(): void {
        getThemeNameField(this.element)?.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                void this.saveCurrentTheme(event.currentTarget as HTMLElement);
            }
        });
    }

    async save(control: HTMLElement, write: () => Promise<unknown>, failure = 'saveFailed'): Promise<void> {
        try {
            await whileSaving(control, write);
        } catch (err) {
            log.fail(loc(failure), err);
        }

        void this.render();
    }

    async saveCurrentTheme(control: HTMLElement): Promise<void> {
        const field = getThemeNameField(this.element);
        const name = field?.value.trim();

        if (!name) {
            field?.focus();

            return;
        }

        await this.save(control, () => savePreset(name, getTheme()), 'saved.failed');
    }

    static onAddSwatch(this: ThemeEditor, _event: PointerEvent, target: HTMLElement): void {
        void this.save(target, () => addSwatch(target.dataset.kind as PaletteKey));
    }

    static onDeleteSwatch(this: ThemeEditor, _event: PointerEvent, target: HTMLElement): void {
        const { kind, index } = target.dataset;

        void this.save(target, () => deleteSwatch(kind as PaletteKey, Number(index)));
    }

    static onPickFinish(this: ThemeEditor, _event: PointerEvent, target: HTMLElement): void {
        void this.save(target, () => writeTheme({ finish: target.dataset.finish }));
    }

    static onClearTextColour(this: ThemeEditor, _event: PointerEvent, target: HTMLElement): void {
        void this.save(target, () => writeTheme({ [target.dataset.text as ColourKey]: '' }));
    }

    static onLoadTheme(this: ThemeEditor, _event: PointerEvent, target: HTMLElement): void {
        const saved = listPresets().find((candidate) => candidate.id === target.dataset.saved);

        if (!saved) {
            return;
        }

        void this.save(target, () => writeTheme(toLook(saved)));
    }

    static onSaveTheme(this: ThemeEditor, _event: PointerEvent, target: HTMLElement): void {
        void this.saveCurrentTheme(target);
    }

    static onDeleteTheme(this: ThemeEditor, _event: PointerEvent, target: HTMLElement): void {
        void this.save(target, () => deletePreset(target.dataset.saved ?? ''), 'saved.failed');
    }

    static onReset(this: ThemeEditor, _event: PointerEvent, target: HTMLElement): void {
        void this.save(target, () => writeTheme(toLook({})));
    }
}

// registerMenu creates a new instance per click
class ThemeMenu extends ApplicationV2 {
    render(): ThemeMenu {
        openThemeEditor();

        return this;
    }
}

export function registerThemeMenu(): void {
    game.settings.registerMenu(MODULE_ID, 'librarySettings', {
        name: 'GRIMMTALE.theme.menu',
        label: 'GRIMMTALE.theme.menuLabel',
        hint: 'GRIMMTALE.theme.menuHint',
        icon: ICON,
        type: ThemeMenu,
        restricted: false
    });
}

export function openThemeEditor(): ThemeEditor {
    const open = foundry.applications.instances.get(WINDOW_ID) as ThemeEditor | undefined;

    if (open) {
        open.bringToFront();

        return open;
    }

    const app = new ThemeEditor();
    void app.render(true);

    return app;
}
