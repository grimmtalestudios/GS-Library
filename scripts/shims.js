import { MODULE_ID } from './constants.js';
import { createLogger } from './logger.js';
const log = createLogger(MODULE_ID);
const SFX_MODULE = 'dice-so-nice-more-sfx-triggers';
const SFX_MODULE_HOOKS = ['dnd5e.rollSkill', 'dnd5e.rollAbilitySave', 'dnd5e.rollAbilityTest'];
const SFX_PREFIXES = {
    skill: 'dnd5e-skill',
    save: 'dnd5e-save',
    ability: 'dnd5e-ability-test'
};
// The SFX module's listeners are anonymous
function isSfxListener(fn) {
    const source = String(fn);
    return typeof fn === 'function' && source.includes('options.sfx') && source.includes('dice');
}
// Old (actor, roll, key) listeners throw on dnd5e's (rolls, data)
function isBrokenOnCurrentSignature(fn) {
    try {
        fn([{
                dice: [{
                        total: 1,
                        options: {}
                    }]
            }], {
            ability: 'con',
            skill: 'ath',
            subject: null
        });
        return false;
    }
    catch {
        return true;
    }
}
function getTriggerId(message) {
    const { type = '', skillId, ability } = (message.getFlag('dnd5e', 'roll') ?? {});
    const prefix = SFX_PREFIXES[type];
    const key = skillId ?? ability;
    return prefix && key ? `${prefix}-${key}` : null;
}
function onPreCreateChatMessage(message) {
    const id = getTriggerId(message);
    const die = message.rolls[0]?.dice[0];
    if (!id || !die) {
        return;
    }
    die.options.sfx = {
        id,
        result: die.total
    };
    message.updateSource({ rolls: message.rolls }); // writes the tag into the stored roll JSON
}
function removeBrokenSfxListeners() {
    let removed = 0;
    for (const hook of SFX_MODULE_HOOKS) {
        const broken = [...Hooks.events[hook] ?? []]
            .filter(({ fn }) => isSfxListener(fn) && isBrokenOnCurrentSignature(fn));
        for (const { id } of broken) {
            Hooks.off(hook, id);
            removed++;
        }
    }
    return removed;
}
export function fixSfxTriggers() {
    if (game.system.id !== 'dnd5e' || !game.modules.get(SFX_MODULE)?.active) {
        return;
    }
    const removed = removeBrokenSfxListeners();
    if (!removed) {
        return;
    }
    Hooks.on('preCreateChatMessage', onPreCreateChatMessage); // dnd5e calls its roll hooks after creating the message
    log.info(`Shimmed ${SFX_MODULE}: replaced ${removed} listener(s) broken against dnd5e ${game.system.version}`);
}
