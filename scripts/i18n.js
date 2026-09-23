export function createLocalizer(prefix) {
    return (key, data) => {
        const full = `${prefix}.${key}`;
        return data ? game.i18n.format(full, data) : game.i18n.localize(full);
    };
}
