import { hasUserOverride, resolveAppearance, setAppearance, toLook } from './appearance.js';
import { markSwatches, paintDraft } from './appearancePaint.js';
import { isDarkGround } from './colour.js';
import { MODULE_ID } from './constants.js';
import { finishesFor } from './finishes.js';
import { bindFrame } from './frame.js';
import { createLocalizer } from './i18n.js';
import { createLogger } from './logger.js';
import { getFooterContext } from './moduleInfo.js';
import { ACCENTS, GROUNDS } from './palette.js';
import { deletePreset, listPresets, savePreset } from './presets.js';
import { parseShareCode, toShareCode } from './shareCode.js';
import { createTheme } from './theme.js';
import { type Appearance, buildTokens, TEXT_KEYS } from './tokens.js';

type Scope = 'world' | 'user' | 'follow';
type Look = Required<Appearance>;
type ColourKey = Exclude<keyof Look, 'finish'>;

interface Draft extends Look {
    scope: Scope;
}

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

function getInitialScope(): Scope {
    if (hasUserOverride()) {
        return 'user';
    }

    return game.user.isGM ? 'world' : 'follow';
}

function getInitialDraft(): Draft {
    return {
        ...toLook(resolveAppearance()),
        scope: getInitialScope()
    };
}

function swatchGroup(picks: ColourKey, swatches: Swatch[], current: string) {
    return {
        picks,
        legend: loc(`${picks}.legend`),
        custom: loc(`${picks}.custom`),
        value: current,
        swatches: swatches.map((swatch) => ({
            ...swatch,
            active: swatch.colour === current
        }))
    };
}

function finishChoices(draft: Draft) {
    return Object.entries(finishesFor(isDarkGround(draft.ground))).map(([key, finish]) => ({
        key,
        label: finish.label,
        active: key === draft.finish
    }));
}

function textColourRows(draft: Draft) {
    const tokens = buildTokens(draft);

    return TEXT_KEYS.map((key) => ({
        key,
        label: loc(`text.${key}`),
        colour: tokens[`--gs-${key}`],
        isSet: Boolean(draft[key])
    }));
}

function scopeChoices(scope: Scope) {
    const offered: Scope[] = game.user.isGM ? ['world', 'user'] : ['follow', 'user'];

    return offered.map((value) => ({
        value,
        label: loc(`scope.${value}`),
        active: value === scope
    }));
}

function listPresetChoices(draft: Draft) {
    return listPresets().map((preset) => ({
        ...preset,
        active: preset.ground === draft.ground && preset.accent === draft.accent
    }));
}

function getPresetNameField(root: HTMLElement): HTMLInputElement | null {
    return root.querySelector<HTMLInputElement>('[name="presetName"]');
}

function getShareInput(root: HTMLElement): HTMLInputElement | null {
    return root.querySelector<HTMLInputElement>('[name="shareInput"]');
}

function bindEnterKey(field: HTMLInputElement | null, action: () => void): void {
    field?.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') {
            return;
        }

        // Stop Enter submitting the form (it closes the window)
        event.preventDefault();
        action();
    });
}

function markSaving(form: HTMLFormElement): void {
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');

    button?.toggleAttribute('disabled', true);
    button?.setAttribute('aria-busy', 'true');
    button?.querySelector('i')?.setAttribute('class', 'fa-solid fa-spinner gs-spin');
}

async function saveDraft({ scope, ...look }: Draft): Promise<void> {
    if (scope === 'world') {
        await setAppearance(look, { scope: 'world' });

        // Turn the GM's override off so the new world appearance shows
        await setAppearance({ enabled: false });

        return;
    }

    await setAppearance(scope === 'user' ? {
        ...look,
        enabled: true
    } : { enabled: false });
}

class AppearanceWindow extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: WINDOW_ID,
        tag: 'form',
        classes: ['gs-shared-base', 'gs-library-appearance-window'],
        window: {
            title: 'GRIMMTALE.settings.title',
            icon: ICON,
            resizable: false
        },
        position: {
            width: 660, // room for six accent swatches beside the preview
            height: 'auto'
        },
        form: {
            handler: AppearanceWindow.onSubmit,
            submitOnChange: false,
            closeOnSubmit: true
        },
        actions: {
            pickColour: AppearanceWindow.onPickColour,
            pickFinish: AppearanceWindow.onPickFinish,
            pickScope: AppearanceWindow.onPickScope,
            clearTextColour: AppearanceWindow.onClearTextColour,
            applyPreset: AppearanceWindow.onApplyPreset,
            savePreset: AppearanceWindow.onSavePreset,
            deletePreset: AppearanceWindow.onDeletePreset,
            copyShareCode: AppearanceWindow.onCopyShareCode,
            applyShareCode: AppearanceWindow.onApplyShareCode,
            reset: AppearanceWindow.onReset,
            cancel: AppearanceWindow.onCancel
        }
    };

    static PARTS = {
        body: {
            template: TEMPLATE,
            scrollable: ['.gs-library-appearance-column:first-child', '.gs-library-appearance-column:last-child']
        }
    };

    declare element: HTMLElement;

    draft = getInitialDraft();

    async _prepareContext(options: unknown) {
        const context = await super._prepareContext(options);

        return {
            ...context,
            ...getFooterContext(MODULE_ID),
            swatchGroups: [
                swatchGroup('ground', GROUND_SWATCHES, this.draft.ground),
                swatchGroup('accent', ACCENT_SWATCHES, this.draft.accent)
            ],
            finishes: finishChoices(this.draft),
            textColours: textColourRows(this.draft),
            scopes: scopeChoices(this.draft.scope),
            presets: listPresetChoices(this.draft)
        };
    }

    _onFirstRender(context: unknown, options: unknown): void {
        super._onFirstRender(context, options);
        bindFrame(this, theme);
    }

    _onRender(context: unknown, options: unknown): void {
        super._onRender(context, options);
        paintDraft(this.element, this.draft);

        for (const well of this.element.querySelectorAll<HTMLInputElement>('input[type="color"]')) {
            well.addEventListener('input', () => this.onWellInput(well));
            well.addEventListener('change', () => void this.render());
        }

        bindEnterKey(getPresetNameField(this.element), () => void this.saveDraftAsPreset());
        bindEnterKey(getShareInput(this.element), () => this.applyShareCode());
    }

    async saveDraftAsPreset(): Promise<void> {
        const field = getPresetNameField(this.element);
        const name = field?.value.trim();

        if (!name) {
            field?.focus();

            return;
        }

        await this.writePresets(() => savePreset(name, this.draft));
    }

    async writePresets(write: () => Promise<unknown>): Promise<void> {
        try {
            await write();
        } catch (err) {
            log.fail(loc('presetFailed'), err);

            return;
        }

        void this.render();
    }

    applyShareCode(): void {
        const field = getShareInput(this.element);
        const code = field?.value ?? '';
        const look = parseShareCode(code);

        if (!look) {
            if (code.trim()) {
                ui.notifications?.warn(loc('share.notALook'));
            }

            field?.focus();

            return;
        }

        this.draft = {
            ...look,
            scope: this.draft.scope
        };
        void this.render();
    }

    onWellInput(well: HTMLInputElement): void {
        const picks = well.dataset.picks as ColourKey;

        this.draft[picks] = well.value;

        // Re-rendering mid-drag closes the colour picker
        paintDraft(this.element, this.draft);
        markSwatches(this.element, picks, well.value);
    }

    static onPickColour(this: AppearanceWindow, _event: PointerEvent, target: HTMLElement): void {
        const { picks, colour } = target.dataset;

        if (!colour) {
            return;
        }

        this.draft[picks as ColourKey] = colour;
        void this.render();
    }

    static onPickFinish(this: AppearanceWindow, _event: PointerEvent, target: HTMLElement): void {
        this.draft.finish = target.dataset.finish ?? this.draft.finish;
        void this.render();
    }

    static onPickScope(this: AppearanceWindow, _event: PointerEvent, target: HTMLInputElement): void {
        this.draft.scope = target.value as Scope;
    }

    static onClearTextColour(this: AppearanceWindow, _event: PointerEvent, target: HTMLElement): void {
        this.draft[target.dataset.text as ColourKey] = '';
        void this.render();
    }

    static onApplyPreset(this: AppearanceWindow, _event: PointerEvent, target: HTMLElement): void {
        const preset = listPresets().find((candidate) => candidate.id === target.dataset.preset);

        if (!preset) {
            return;
        }

        this.draft.ground = preset.ground;
        this.draft.accent = preset.accent;
        void this.render();
    }

    static onSavePreset(this: AppearanceWindow): void {
        void this.saveDraftAsPreset();
    }

    static onDeletePreset(this: AppearanceWindow, _event: PointerEvent, target: HTMLElement): void {
        void this.writePresets(() => deletePreset(target.dataset.preset ?? ''));
    }

    static async onCopyShareCode(this: AppearanceWindow): Promise<void> {
        await game.clipboard.copyPlainText(toShareCode(this.draft));
        ui.notifications?.info(loc('share.copied'));
    }

    static onApplyShareCode(this: AppearanceWindow): void {
        this.applyShareCode();
    }

    static onReset(this: AppearanceWindow): void {
        this.draft = {
            ...toLook({}),
            scope: this.draft.scope
        };
        void this.render();
    }

    static onCancel(this: AppearanceWindow): void {
        void this.close();
    }

    static async onSubmit(this: AppearanceWindow, _event: SubmitEvent, form: HTMLFormElement): Promise<void> {
        markSaving(form);

        try {
            await saveDraft(this.draft);
        } catch (err) {
            log.fail(loc('saveFailed'), err);
        }
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
