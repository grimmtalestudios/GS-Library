import { MODULE_ID } from './constants.js';
import { createLogger } from './logger.js';
const log = createLogger(MODULE_ID);
export function isPeerActive(moduleId) {
    return Boolean(game.modules.get(moduleId)?.active);
}
export function getPeerApi(moduleId) {
    const module = game.modules.get(moduleId);
    if (!module?.active) {
        return null;
    }
    return module.api ?? null; // null while that module is in init
}
export function getPeerMethod(moduleId, names) {
    const api = getPeerApi(moduleId);
    if (!api) {
        return null;
    }
    const name = [names].flat().find((candidate) => typeof api[candidate] === 'function');
    return name ? api[name].bind(api) : null;
}
export function callPeer(moduleId, names, args = [], fallback = null) {
    const method = getPeerMethod(moduleId, names);
    if (!method) {
        return fallback;
    }
    try {
        return method(...args);
    }
    catch (err) {
        log.warn(`${moduleId} rejected a call to ${names}`, err);
        return fallback;
    }
}
export function bindPeerReady(moduleId, callback) {
    const api = getPeerApi(moduleId);
    if (api) {
        callback(api);
        return () => { };
    }
    const hook = `${moduleId}.ready`;
    const hookId = Hooks.once(hook, callback);
    return () => Hooks.off(hook, hookId);
}
export function publishApi(moduleId, api, options = {}) {
    const { gameAlias, globalAlias, hook = true, freeze = true } = options;
    const published = freeze ? Object.freeze(api) : api;
    const module = game.modules.get(moduleId);
    if (module) {
        module.api = published;
    }
    if (gameAlias) {
        game[gameAlias] = published;
    }
    if (globalAlias) {
        globalThis[globalAlias] = published;
    }
    if (hook) {
        Hooks.callAll(`${moduleId}.ready`, published);
    }
    return published;
}
