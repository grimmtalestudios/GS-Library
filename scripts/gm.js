// activeGM resolves to the same user on every client
export function getPrimaryGM() {
    return game.users?.activeGM ?? null; // game.users is created after init
}
export function isPrimaryGM() {
    const gm = getPrimaryGM();
    return gm !== null && gm.id === game.user.id;
}
export function hasActiveGM() {
    return getPrimaryGM() !== null;
}
// Includes inactive GMs so one reconnecting mid-send gets the message
export function getGMIds({ activeOnly = false } = {}) {
    const gms = game.users?.filter((user) => user.isGM && (!activeOnly || user.active)) ?? [];
    return gms.map((user) => user.id);
}
