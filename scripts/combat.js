const TURN_FIELDS = ['turn', 'round', 'active', 'combatants'];
const lastDelivered = new WeakMap();
// combat.turn can stay the same when combatants change
function getSignature(combat) {
    return [combat.id, combat.round, combat.turn, combat.combatant?.id ?? '-', combat.started].join(':');
}
function getTurnChange(combat) {
    const combatant = combat.combatant ?? null;
    return {
        combat,
        combatant,
        tokenId: combatant?.tokenId ?? null,
        actorId: combatant?.actorId ?? null,
        round: combat.round ?? 0,
        turn: combat.turn ?? 0,
        started: true,
        ended: false
    };
}
function getCombatEnd(combat) {
    return {
        combat,
        combatant: null,
        tokenId: null,
        actorId: null,
        round: combat.round ?? 0,
        turn: combat.turn ?? 0,
        started: false,
        ended: true
    };
}
function deliverTurn(combat, callback) {
    const signature = getSignature(combat);
    if (!combat.started || lastDelivered.get(combat) === signature) {
        return;
    }
    lastDelivered.set(combat, signature);
    callback(getTurnChange(combat));
}
function deliverEnd(combat, callback, notifyOnEnd) {
    // Forget the combat so a restart reports its first turn
    lastDelivered.delete(combat);
    if (notifyOnEnd) {
        callback(getCombatEnd(combat));
    }
}
export function bindCombatTurns(callback, { notifyOnEnd = true } = {}) {
    const onUpdate = (combat, changed) => {
        if (!TURN_FIELDS.some((field) => field in changed)) {
            return;
        }
        if (changed.active === false) {
            deliverEnd(combat, callback, notifyOnEnd);
            return;
        }
        deliverTurn(combat, callback);
    };
    const hookIds = {
        // combatTurnChange waits for the GM and skips combatant changes
        updateCombat: Hooks.on('updateCombat', onUpdate),
        combatTurnChange: Hooks.on('combatTurnChange', (combat) => deliverTurn(combat, callback)),
        deleteCombat: Hooks.on('deleteCombat', (combat) => deliverEnd(combat, callback, notifyOnEnd))
    };
    return () => Object.entries(hookIds).forEach(([hook, id]) => Hooks.off(hook, id));
}
export function getViewedCombat() {
    return game.combats.viewed ?? game.combat;
}
export function getCombatantToken(combatant) {
    if (!combatant?.tokenId) {
        return null;
    }
    return canvas.tokens?.get(combatant.tokenId) ?? null;
}
