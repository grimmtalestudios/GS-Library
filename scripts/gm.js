// activeGM resolves to the same user on every client
export function getPrimaryGM() {
    return game.users.activeGM ?? null;
}
export function isPrimaryGM() {
    return game.user.id === getPrimaryGM()?.id;
}
export function hasActiveGM() {
    return getPrimaryGM() !== null;
}
// Includes inactive GMs so one reconnecting mid-send gets the message
export function getGMIds({ activeOnly = false } = {}) {
    return game.users
        .filter((user) => user.isGM && (!activeOnly || user.active))
        .map((user) => user.id);
}
