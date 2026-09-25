import { scoreTokens } from './audit.js';
import { isDarkGround } from './colour.js';
import { finishesFor } from './finishes.js';
import { createLocalizer } from './i18n.js';
import { toShareCode } from './shareCode.js';
import { buildSurface, isSeeThrough, toTranslucent } from './surface.js';
import { buildTokens } from './tokens.js';
const loc = createLocalizer('GRIMMTALE.settings');
function setStyles(element, styles) {
    for (const [name, value] of Object.entries(styles)) {
        element?.style.setProperty(name, value);
    }
}
function paintPreview(root, draft) {
    const tokens = buildTokens(draft);
    const surface = buildSurface(draft, true);
    setStyles(root.querySelector('[data-preview]'), tokens);
    setStyles(root.querySelector('[data-preview-body]'), surface.content);
    setStyles(root.querySelector('[data-preview-header]'), {
        'background-color': surface.header,
        '--gs-ink': tokens['--gs-title']
    });
}
function paintFinishSamples(root, draft) {
    const finishes = finishesFor(isDarkGround(draft.ground));
    for (const sample of root.querySelectorAll('[data-finish-sample]')) {
        const finish = finishes[sample.dataset.finishSample ?? ''];
        setStyles(sample, {
            'background-color': toTranslucent(draft.ground, finish.alpha),
            'background-image': finish.image
        });
    }
}
function scoreNote(draft, score) {
    if (score.failing) {
        return loc('score.weakest', { name: score.weakest });
    }
    return isSeeThrough(draft) ? loc('score.seeThrough') : '';
}
function setText(element, text) {
    if (element) {
        element.textContent = text;
    }
}
function paintShareCode(root, draft) {
    const field = root.querySelector('[data-share-code]');
    if (field) {
        field.value = toShareCode(draft);
    }
}
function paintScore(root, draft) {
    const score = scoreTokens(buildTokens(draft));
    root.querySelector('[data-score]')?.setAttribute('data-verdict', score.verdict);
    setText(root.querySelector('[data-score-value]'), String(score.score));
    setText(root.querySelector('[data-score-verdict]'), loc(`score.${score.verdict}`));
    setText(root.querySelector('[data-score-note]'), scoreNote(draft, score));
}
export function paintDraft(root, draft) {
    paintPreview(root, draft);
    paintFinishSamples(root, draft);
    paintScore(root, draft);
    paintShareCode(root, draft);
}
export function markSwatches(root, picks, current) {
    for (const swatch of root.querySelectorAll(`[data-action="pickColour"][data-picks="${picks}"]`)) {
        swatch.ariaPressed = String(swatch.dataset.colour === current);
    }
}
