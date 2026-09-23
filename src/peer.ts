import { MODULE_ID } from './constants.js';
import { createLogger } from './logger.js';

type PeerApi = Record<string, unknown>;
type PeerMethod = (...args: unknown[]) => unknown;

interface PublishOptions {
    gameAlias?: string;
    globalAlias?: string;
    hook?: boolean;
    freeze?: boolean;
}

const log = createLogger(MODULE_ID);

export function isPeerActive(moduleId: string): boolean {
    return Boolean(game.modules.get(moduleId)?.active);
}

export function getPeerApi(moduleId: string): PeerApi | null {
    const module = game.modules.get(moduleId);
    if (!module?.active) {
        return null;
    }

    return (module.api as PeerApi | undefined) ?? null; // null while that module is in init
}

export function getPeerMethod(moduleId: string, names: string | string[]): PeerMethod | null {
    const api = getPeerApi(moduleId);
    if (!api) {
        return null;
    }

    const name = [names].flat().find((candidate) => typeof api[candidate] === 'function');

    return name ? (api[name] as PeerMethod).bind(api) : null;
}

export function callPeer(moduleId: string, names: string | string[], args: unknown[] = [], fallback: unknown = null) {
    const method = getPeerMethod(moduleId, names);
    if (!method) {
        return fallback;
    }

    try {
        return method(...args);
    } catch (err) {
        log.warn(`${moduleId} rejected a call to ${names}`, err);

        return fallback;
    }
}

export function bindPeerReady(moduleId: string, callback: (api: PeerApi) => void): () => void {
    const api = getPeerApi(moduleId);
    if (api) {
        callback(api);

        return () => {};
    }

    const hook = `${moduleId}.ready`;
    const hookId = Hooks.once(hook, callback);

    return () => Hooks.off(hook, hookId);
}

export function publishApi(moduleId: string, api: PeerApi, options: PublishOptions = {}): PeerApi {
    const { gameAlias, globalAlias, hook = true, freeze = true } = options;
    const published = freeze ? Object.freeze(api) : api;

    const module = game.modules.get(moduleId);
    if (module) {
        module.api = published;
    }

    if (gameAlias) {
        (game as unknown as PeerApi)[gameAlias] = published;
    }

    if (globalAlias) {
        (globalThis as unknown as PeerApi)[globalAlias] = published;
    }

    if (hook) {
        Hooks.callAll(`${moduleId}.ready`, published);
    }

    return published;
}
