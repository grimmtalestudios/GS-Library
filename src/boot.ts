import type { Logger } from './logger.js';

export function bootPhase(log: Logger, label: string, fn: () => void): boolean {
    try {
        fn();

        return true;
    } catch (err) {
        log.error(`boot phase "${label}" failed (isGM=${game.user?.isGM})`, err); // init errors are often player-only

        return false;
    }
}

export function bootPhases(log: Logger, steps: Record<string, () => void>): string[] {
    return Object.entries(steps)
        .filter(([label, fn]) => !bootPhase(log, label, fn))
        .map(([label]) => label);
}

// Foundry stops calling a hook's listeners after one throws, core's included
export function safeHook<Args extends unknown[], Result>(
    log: Logger,
    label: string,
    fn: (...args: Args) => Result
): (...args: Args) => Result | undefined {
    return (...args) => {
        try {
            return fn(...args);
        } catch (err) {
            log.error(`hook "${label}" threw`, err);

            return undefined;
        }
    };
}
