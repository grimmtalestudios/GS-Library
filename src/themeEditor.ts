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
import { type Appearance, buildTokens, TEXT_KEYS } from './tokens.js';

type Theme = Required<Appearance>;
type ColourKey = Exclude<keyof Theme, 'finish'>;

interface Swatch {
    label: string;
    colour: string;
}

const WINDOW_ID = `${MODULE_ID}-theme`;
const ICON = 'fa-solid fa-palette';
const TEMPLATE = `modules/${MODULE_ID}/templates/theme-editor.hbs`;
const BASE_SWATCHES: Swatch[] = Object.values(GROUNDS).map(({ label, bg }) => ({
    label,
    colour: bg
}));
const ACCENT_SWATCHES: Swatch[] = Object.values(ACCENTS).map(({ label, value }) => ({
    label,
    colour: value
}));

const loc = createLocalizer('GRIMMTALE.theme');
const log = createLogger(MODULE_ID);
const frameTheme = createTheme(MODULE_ID);
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

function getTheme(): Theme {
    return toLook(resolveAppearance());
}

async function writeTheme(patch: Partial<Theme>): Promise<unknown> {
    if (game.user.isGM && !hasUserOverride()) {
        return setAppearance(patch, { scope: 'world' });
    }

    return setAppearance({
        ...patch,
        enabled: true
    });
}

function swatchGroup(picks: ColourKey, labels: string, swatches: Swatch[], current: string) {
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

function scoreNote(theme: Theme, score: ReturnType<typeof scoreTokens>): string {
    if (score.failing) {
        return loc('score.weakest', { name: score.weakest });
    }

    return isSeeThrough(theme) ? loc('score.seeThrough') : '';
}

function scoreSummary(theme: Theme) {
    const score = scoreTokens(buildTokens(theme));

    return {
        value: score.score,
        verdict: score.verdict,
        label: loc(`score.${score.verdict}`),
        note: scoreNote(theme, score)
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

    declare element: HTMLElement;

    async _prepareContext(options: unknown) {
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

    _onFirstRender(context: unknown, options: unknown): void {
        super._onFirstRender(context, options);
        bindFrame(this, frameTheme);
    }

    _onRender(context: unknown, options: unknown): void {
        super._onRender(context, options);

        for (const well of this.element.querySelectorAll<HTMLInputElement>('input[type="color"]')) {
            well.addEventListener('change', () => void this.save(well, () => writeTheme({
                [well.dataset.picks as ColourKey]: well.value
            })));
        }

        const ownTheme = this.element.querySelector<HTMLInputElement>('[name="ownTheme"]');

        ownTheme?.addEventListener('change', () => void this.save(ownTheme, () => setAppearance({
            enabled: ownTheme.checked
        })));

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

    static onPickColour(this: ThemeEditor, _event: PointerEvent, target: HTMLElement): void {
        const { picks, colour } = target.dataset;

        void this.save(target, () => writeTheme({ [picks as ColourKey]: colour }));
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
