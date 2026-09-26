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

type Look = Required<Appearance>;
type ColourKey = Exclude<keyof Look, 'finish'>;

interface Swatch {
    label: string;
    colour: string;
}

const WINDOW_ID = `${MODULE_ID}-appearance`;
const ICON = 'fa-solid fa-palette';
const TEMPLATE = `modules/${MODULE_ID}/templates/appearance.hbs`;
const GROUND_SWATCHES: Swatch[] = Object.values(GROUNDS).map(({ label, bg }) => ({
    label,
    colour: bg
}));
const ACCENT_SWATCHES: Swatch[] = Object.values(ACCENTS).map(({ label, value }) => ({
    label,
    colour: value
}));

const loc = createLocalizer('GRIMMTALE.settings');
const log = createLogger(MODULE_ID);
const theme = createTheme(MODULE_ID);
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

function getLook(): Look {
    return toLook(resolveAppearance());
}

async function writeLook(patch: Partial<Look>): Promise<unknown> {
    if (game.user.isGM && !hasUserOverride()) {
        return setAppearance(patch, { scope: 'world' });
    }

    return setAppearance({
        ...patch,
        enabled: true
    });
}

function swatchGroup(picks: ColourKey, swatches: Swatch[], current: string) {
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

function finishChoices(look: Look) {
    return Object.entries(finishesFor(isDarkGround(look.ground))).map(([key, finish]) => ({
        key,
        label: finish.label,
        active: key === look.finish
    }));
}

function textColourRows(look: Look) {
    const tokens = buildTokens(look);

    return TEXT_KEYS.map((key) => ({
        key,
        label: loc(`text.${key}`),
        colour: tokens[`--gs-${key}`],
        isSet: Boolean(look[key])
    }));
}

function scoreNote(look: Look, score: ReturnType<typeof scoreTokens>): string {
    if (score.failing) {
        return loc('score.weakest', { name: score.weakest });
    }

    return isSeeThrough(look) ? loc('score.seeThrough') : '';
}

function scoreSummary(look: Look) {
    const score = scoreTokens(buildTokens(look));

    return {
        value: score.score,
        verdict: score.verdict,
        label: loc(`score.${score.verdict}`),
        note: scoreNote(look, score)
    };
}

function isSameLook(a: Look, b: Look): boolean {
    return Object.keys(a).every((key) => a[key as keyof Look] === b[key as keyof Look]);
}

function listPresetChoices(look: Look) {
    const finishes = finishesFor(true);

    return listPresets().map((preset) => ({
        ...preset,
        finishLabel: finishes[preset.finish].label,
        active: isSameLook(toLook(preset), look)
    }));
}

function getPresetNameField(root: HTMLElement): HTMLInputElement | null {
    return root.querySelector<HTMLInputElement>('[name="presetName"]');
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

    declare element: HTMLElement;

    async _prepareContext(options: unknown) {
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

    _onFirstRender(context: unknown, options: unknown): void {
        super._onFirstRender(context, options);
        bindFrame(this, theme);
    }

    _onRender(context: unknown, options: unknown): void {
        super._onRender(context, options);

        for (const well of this.element.querySelectorAll<HTMLInputElement>('input[type="color"]')) {
            well.addEventListener('change', () => void this.save(well, () => writeLook({
                [well.dataset.picks as ColourKey]: well.value
            })));
        }

        const ownLook = this.element.querySelector<HTMLInputElement>('[name="ownLook"]');

        ownLook?.addEventListener('change', () => void this.save(ownLook, () => setAppearance({
            enabled: ownLook.checked
        })));

        getPresetNameField(this.element)?.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                void this.saveLookAsPreset(event.currentTarget as HTMLElement);
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

    async saveLookAsPreset(control: HTMLElement): Promise<void> {
        const field = getPresetNameField(this.element);
        const name = field?.value.trim();

        if (!name) {
            field?.focus();

            return;
        }

        await this.save(control, () => savePreset(name, getLook()), 'presetFailed');
    }

    static onPickColour(this: AppearanceWindow, _event: PointerEvent, target: HTMLElement): void {
        const { picks, colour } = target.dataset;

        void this.save(target, () => writeLook({ [picks as ColourKey]: colour }));
    }

    static onPickFinish(this: AppearanceWindow, _event: PointerEvent, target: HTMLElement): void {
        void this.save(target, () => writeLook({ finish: target.dataset.finish }));
    }

    static onClearTextColour(this: AppearanceWindow, _event: PointerEvent, target: HTMLElement): void {
        void this.save(target, () => writeLook({ [target.dataset.text as ColourKey]: '' }));
    }

    static onApplyPreset(this: AppearanceWindow, _event: PointerEvent, target: HTMLElement): void {
        const preset = listPresets().find((candidate) => candidate.id === target.dataset.preset);

        if (!preset) {
            return;
        }

        void this.save(target, () => writeLook(toLook(preset)));
    }

    static onSavePreset(this: AppearanceWindow, _event: PointerEvent, target: HTMLElement): void {
        void this.saveLookAsPreset(target);
    }

    static onDeletePreset(this: AppearanceWindow, _event: PointerEvent, target: HTMLElement): void {
        void this.save(target, () => deletePreset(target.dataset.preset ?? ''), 'presetFailed');
    }

    static onReset(this: AppearanceWindow, _event: PointerEvent, target: HTMLElement): void {
        void this.save(target, () => writeLook(toLook({})));
    }
}

// registerMenu creates a new instance per click
class AppearanceMenu extends ApplicationV2 {
    render(): AppearanceMenu {
        openAppearanceWindow();

        return this;
    }
}

export function registerAppearanceMenu(): void {
    game.settings.registerMenu(MODULE_ID, 'librarySettings', {
        name: 'GRIMMTALE.settings.menuName',
        label: 'GRIMMTALE.settings.menuLabel',
        hint: 'GRIMMTALE.settings.menuHint',
        icon: ICON,
        type: AppearanceMenu,
        restricted: false
    });
}

export function openAppearanceWindow(): AppearanceWindow {
    const open = foundry.applications.instances.get(WINDOW_ID) as AppearanceWindow | undefined;

    if (open) {
        open.bringToFront();

        return open;
    }

    const app = new AppearanceWindow();
    void app.render(true);

    return app;
}
