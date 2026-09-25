import { scoreTokens } from './audit.js';
import { isDarkGround } from './colour.js';
import { finishesFor } from './finishes.js';
import { createLocalizer } from './i18n.js';
import { toShareCode } from './shareCode.js';
import { buildSurface, isSeeThrough, toTranslucent } from './surface.js';
import { type Appearance, buildTokens } from './tokens.js';

type Look = Required<Appearance>;

const loc = createLocalizer('GRIMMTALE.settings');

function setStyles(element: HTMLElement | null, styles: Record<string, string>): void {
    for (const [name, value] of Object.entries(styles)) {
        element?.style.setProperty(name, value);
    }
}

function paintPreview(root: HTMLElement, draft: Look): void {
    const tokens = buildTokens(draft);
    const surface = buildSurface(draft, true);

    setStyles(root.querySelector<HTMLElement>('[data-preview]'), tokens);
    setStyles(root.querySelector<HTMLElement>('[data-preview-body]'), surface.content);
    setStyles(root.querySelector<HTMLElement>('[data-preview-header]'), {
        'background-color': surface.header,
        '--gs-ink': tokens['--gs-title']
    });
}

function paintFinishSamples(root: HTMLElement, draft: Look): void {
    const finishes = finishesFor(isDarkGround(draft.ground));

    for (const sample of root.querySelectorAll<HTMLElement>('[data-finish-sample]')) {
        const finish = finishes[sample.dataset.finishSample ?? ''];

        setStyles(sample, {
            'background-color': toTranslucent(draft.ground, finish.alpha),
            'background-image': finish.image
        });
    }
}

function scoreNote(draft: Look, score: ReturnType<typeof scoreTokens>): string {
    if (score.failing) {
        return loc('score.weakest', { name: score.weakest });
    }

    return isSeeThrough(draft) ? loc('score.seeThrough') : '';
}

function setText(element: Element | null, text: string): void {
    if (element) {
        element.textContent = text;
    }
}

function paintShareCode(root: HTMLElement, draft: Look): void {
    const field = root.querySelector<HTMLInputElement>('[data-share-code]');

    if (field) {
        field.value = toShareCode(draft);
    }
}

function paintScore(root: HTMLElement, draft: Look): void {
    const score = scoreTokens(buildTokens(draft));

    root.querySelector('[data-score]')?.setAttribute('data-verdict', score.verdict);
    setText(root.querySelector('[data-score-value]'), String(score.score));
    setText(root.querySelector('[data-score-verdict]'), loc(`score.${score.verdict}`));
    setText(root.querySelector('[data-score-note]'), scoreNote(draft, score));
}

export function paintDraft(root: HTMLElement, draft: Look): void {
    paintPreview(root, draft);
    paintFinishSamples(root, draft);
    paintScore(root, draft);
    paintShareCode(root, draft);
}

export function markSwatches(root: HTMLElement, picks: string, current: string): void {
    for (const swatch of root.querySelectorAll<HTMLElement>(`[data-action="pickColour"][data-picks="${picks}"]`)) {
        swatch.ariaPressed = String(swatch.dataset.colour === current);
    }
}
