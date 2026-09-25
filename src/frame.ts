import { quietCloseButton } from './dom.js';
import { bindInputMode } from './inputMode.js';
import type { ThemeController } from './theme.js';

// Called from _onFirstRender because core keeps the frame across renders
export function bindFrame(app: { element: HTMLElement }, theme: ThemeController): void {
    theme.apply(app);
    bindInputMode(app.element);
    quietCloseButton(app.element);
}
