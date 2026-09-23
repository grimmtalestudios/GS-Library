// activeGM resolves to the same user on every client
export function getPrimaryGM(): FoundryUser | null {
    return game.users.activeGM ?? null;
}

export function isPrimaryGM(): boolean {
    return game.user.id === getPrimaryGM()?.id;
}

export function hasActiveGM(): boolean {
    return getPrimaryGM() !== null;
}

// Includes inactive GMs so one reconnecting mid-send gets the message
export function getGMIds({ activeOnly = false } = {}): string[] {
    return game.users
        .filter((user) => user.isGM && (!activeOnly || user.active))
        .map((user) => user.id);
}
