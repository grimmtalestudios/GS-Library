import { quietCloseButton } from './dom.js';
import { bindInputMode } from './inputMode.js';
// Called from _onFirstRender because core keeps the frame across renders
export function bindFrame(app, theme) {
    theme.apply(app);
    bindInputMode(app.element);
    quietCloseButton(app.element);
}
