export function findFirst(root, selectors) {
    if (!root) {
        return null;
    }
    for (const selector of selectors) {
        const el = root.querySelector(selector);
        if (el) {
            return {
                el,
                selector
            };
        }
    }
    return null;
}
export function injectOnce(container, markerClass, build, position = 'append') {
    // Core re-renders some windows by patching the DOM, leaving the old copy
    container.querySelectorAll(`.${markerClass}`).forEach((stale) => stale.remove());
    const el = build();
    el.classList.add(markerClass);
    container[position](el);
    return el;
}
export function quietCloseButton(root) {
    const close = root?.querySelector('.window-header [data-action="close"]');
    if (!close) {
        return;
    }
    const tooltip = close.dataset.tooltip;
    if (tooltip && !close.ariaLabel) {
        close.ariaLabel = tooltip;
    }
    delete close.dataset.tooltip;
}
