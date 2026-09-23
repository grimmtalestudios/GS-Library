export type Localizer = (key: string, data?: Record<string, unknown>) => string;

export function createLocalizer(prefix: string): Localizer {
    return (key, data) => {
        const full = `${prefix}.${key}`;

        return data ? game.i18n.format(full, data) : game.i18n.localize(full);
    };
}
