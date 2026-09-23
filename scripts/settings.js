function isRegistered(moduleId, key) {
    return game.settings.settings.has(`${moduleId}.${key}`);
}
export function readSetting(moduleId, key, fallback) {
    if (!isRegistered(moduleId, key)) {
        return fallback;
    }
    return game.settings.get(moduleId, key) ?? fallback;
}
export async function writeSetting(moduleId, key, value) {
    if (!isRegistered(moduleId, key)) {
        return undefined;
    }
    return game.settings.set(moduleId, key, value);
}
export function registerSettings(moduleId, l10nPrefix, definitions) {
    for (const [key, definition] of Object.entries(definitions)) {
        game.settings.register(moduleId, key, {
            name: `${l10nPrefix}.${key}.name`,
            hint: `${l10nPrefix}.${key}.hint`,
            scope: 'world',
            config: true,
            ...definition
        });
    }
}
