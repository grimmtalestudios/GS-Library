export function findFirst(root: ParentNode | null, selectors: string[]) {
    if (!root) {
        return null;
    }

    for (const selector of selectors) {
        const el = root.querySelector<HTMLElement>(selector);
        if (el) {
            return {
                el,
                selector
            };
        }
    }

    return null;
}

export function injectOnce(
    container: HTMLElement,
    markerClass: string,
    build: () => HTMLElement,
    position: 'append' | 'prepend' = 'append'
): HTMLElement {

    // Core re-renders some windows by patching the DOM, leaving the old copy
    container.querySelectorAll(`.${markerClass}`).forEach((stale) => stale.remove());

    const el = build();
    el.classList.add(markerClass);
    container[position](el);

    return el;
}

export function quietCloseButton(root: ParentNode | null | undefined): void {
    const close = root?.querySelector<HTMLElement>('.window-header [data-action="close"]');
    if (!close) {
        return;
    }

    const tooltip = close.dataset.tooltip;
    if (tooltip && !close.ariaLabel) {
        close.ariaLabel = tooltip;
    }

    delete close.dataset.tooltip;
}
