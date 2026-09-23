export function bootPhase(log, label, fn) {
    try {
        fn();
        return true;
    }
    catch (err) {
        log.error(`boot phase "${label}" failed (isGM=${game.user?.isGM})`, err); // init errors are often player-only
        return false;
    }
}
export function bootPhases(log, steps) {
    return Object.entries(steps)
        .filter(([label, fn]) => !bootPhase(log, label, fn))
        .map(([label]) => label);
}
// Foundry stops calling a hook's listeners after one throws, core's included
export function safeHook(log, label, fn) {
    return (...args) => {
        try {
            return fn(...args);
        }
        catch (err) {
            log.error(`hook "${label}" threw`, err);
            return undefined;
        }
    };
}
