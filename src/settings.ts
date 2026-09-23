function isRegistered(moduleId: string, key: string): boolean {
    return game.settings.settings.has(`${moduleId}.${key}`);
}

export function readSetting<T>(moduleId: string, key: string, fallback: T): T {
    if (!isRegistered(moduleId, key)) {
        return fallback;
    }

    return (game.settings.get(moduleId, key) as T | undefined) ?? fallback;
}

export async function writeSetting(moduleId: string, key: string, value: unknown): Promise<unknown> {
    if (!isRegistered(moduleId, key)) {
        return undefined;
    }

    return game.settings.set(moduleId, key, value);
}

export function registerSettings(moduleId: string, l10nPrefix: string, definitions: Record<string, object>): void {
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
