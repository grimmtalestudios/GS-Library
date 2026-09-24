// activeGM resolves to the same user on every client
export function getPrimaryGM(): FoundryUser | null {
    return game.users?.activeGM ?? null; // game.users is created after init
}

export function isPrimaryGM(): boolean {
    const gm = getPrimaryGM();

    return gm !== null && gm.id === game.user.id;
}

export function hasActiveGM(): boolean {
    return getPrimaryGM() !== null;
}

// Includes inactive GMs so one reconnecting mid-send gets the message
export function getGMIds({ activeOnly = false } = {}): string[] {
    const gms = game.users?.filter((user) => user.isGM && (!activeOnly || user.active)) ?? [];

    return gms.map((user) => user.id);
}
