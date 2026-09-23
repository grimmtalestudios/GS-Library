import { hasUserOverride, resolveAppearance, setAppearance, toAppearance } from './appearance.js';
import { isDarkGround } from './colour.js';
import { MODULE_ID } from './constants.js';
import { quietCloseButton } from './dom.js';
import { finishesFor } from './finishes.js';
import { createLocalizer } from './i18n.js';
import { trackInputMode } from './inputMode.js';
import { createLogger } from './logger.js';
import { getFooterContext } from './moduleInfo.js';
import { ACCENTS, GROUNDS } from './palette.js';
import { deletePreset, listPresets, savePreset } from './presets.js';
import { buildSurface, toTranslucent } from './surface.js';
import { createTheme } from './theme.js';
import { type Appearance, buildTokens } from './tokens.js';

type Scope = 'world' | 'user' | 'follow';
type ColourKey = 'ground' | 'accent';
type Look = Required<Appearance>;

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

function toLook({ modules: _modules, ...look }: ReturnType<typeof resolveAppearance>): Look {
    return look;
}

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

function setStyles(element: HTMLElement | null, styles: Record<string, string>): void {
    for (const [name, value] of Object.entries(styles)) {
        element?.style.setProperty(name, value);
    }
}

function paintPreview(root: HTMLElement, draft: Draft): void {
    const tokens = buildTokens(draft);
    const surface = buildSurface(draft, true);

    setStyles(root.querySelector<HTMLElement>('[data-preview]'), tokens);
    setStyles(root.querySelector<HTMLElement>('[data-preview-body]'), surface.content);
    setStyles(root.querySelector<HTMLElement>('[data-preview-header]'), {
        'background-color': surface.header,
        '--gs-ink': tokens['--gs-title']
    });
}

function paintFinishSamples(root: HTMLElement, draft: Draft): void {
    const finishes = finishesFor(isDarkGround(draft.ground));

    for (const sample of root.querySelectorAll<HTMLElement>('[data-finish-sample]')) {
        const finish = finishes[sample.dataset.finishSample ?? ''];

        setStyles(sample, {
            'background-color': toTranslucent(draft.ground, finish.alpha),
            'background-image': finish.image
        });
    }
}

function markSwatches(root: HTMLElement, picks: ColourKey, current: string): void {
    for (const swatch of root.querySelectorAll<HTMLElement>(`[data-action="pickColour"][data-picks="${picks}"]`)) {
        swatch.ariaPressed = String(swatch.dataset.colour === current);
    }
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

export class AppearanceWindow extends HandlebarsApplicationMixin(ApplicationV2) {
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
            applyPreset: AppearanceWindow.onApplyPreset,
            savePreset: AppearanceWindow.onSavePreset,
            deletePreset: AppearanceWindow.onDeletePreset,
            reset: AppearanceWindow.onReset,
            cancel: AppearanceWindow.onCancel
        }
    };

    static PARTS = {
        body: { template: TEMPLATE }
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
            scopes: scopeChoices(this.draft.scope),
            presets: listPresetChoices(this.draft)
        };
    }

    _onFirstRender(context: unknown, options: unknown): void {
        super._onFirstRender(context, options);
        theme.apply(this);
        trackInputMode(this.element);
        quietCloseButton(this.element);
    }

    _onRender(context: unknown, options: unknown): void {
        super._onRender(context, options);
        this.paint();

        for (const well of this.element.querySelectorAll<HTMLInputElement>('input[type="color"]')) {
            well.addEventListener('input', () => this.onWellInput(well));
        }

        getPresetNameField(this.element)?.addEventListener('keydown', (event) => this.onPresetNameKey(event));
    }

    paint(): void {
        paintPreview(this.element, this.draft);
        paintFinishSamples(this.element, this.draft);
    }

    onPresetNameKey(event: KeyboardEvent): void {
        if (event.key !== 'Enter') {
            return;
        }

        // Stop Enter submitting the form (it closes the window)
        event.preventDefault();
        void this.saveDraftAsPreset();
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

    // Re-rendering mid-drag closes the colour picker
    onWellInput(well: HTMLInputElement): void {
        const picks = well.dataset.picks as ColourKey;

        this.draft[picks] = well.value;
        this.paint();
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

    static onReset(this: AppearanceWindow): void {
        this.draft = {
            ...toLook(toAppearance({})),
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
