import { MODULE_ID } from './constants.js';
import { createLogger } from './logger.js';

interface Die {
    total: number;
    options?: { sfx?: unknown };
}

type Listener = (rolls: unknown, data: unknown, legacyKey?: string) => void;

const log = createLogger(MODULE_ID);

const SFX_MODULE = 'dice-so-nice-more-sfx-triggers';

// The SFX module listens for dnd5e's old rollAbilitySave and rollAbilityTest names
const SFX_HOOKS = [
    {
        hook: 'dnd5e.rollSkill',
        prefix: 'dnd5e-skill',
        field: 'skill'
    },
    {
        hook: 'dnd5e.rollAbilitySave',
        prefix: 'dnd5e-save',
        field: 'ability'
    },
    {
        hook: 'dnd5e.rollSavingThrow',
        prefix: 'dnd5e-save',
        field: 'ability'
    },
    {
        hook: 'dnd5e.rollAbilityTest',
        prefix: 'dnd5e-ability-test',
        field: 'ability'
    },
    {
        hook: 'dnd5e.rollAbilityCheck',
        prefix: 'dnd5e-ability-test',
        field: 'ability'
    }
];

// The SFX module's listeners are anonymous
function isSfxListener(fn: unknown): fn is Listener {
    const source = String(fn);

    return typeof fn === 'function' && source.includes('options.sfx') && source.includes('dice');
}

// Old (actor, roll, key) listeners throw on dnd5e's (rolls, data)
function isBrokenOnCurrentSignature(fn: Listener): boolean {
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
    } catch {
        return true;
    }
}

function getKey(data: unknown, legacyKey: string | undefined, field: string): string | undefined {
    const isDataObject = data !== null && typeof data === 'object' && !Array.isArray(data);
    const key = isDataObject ? (data as Record<string, unknown>)[field] : undefined;

    return typeof key === 'string' ? key : legacyKey;
}

function tagDie(rolls: unknown, key: string, prefix: string): void {
    const roll = (Array.isArray(rolls) ? rolls[0] : rolls) as { dice?: Die[] } | undefined;
    const die = roll?.dice?.[0];

    if (!die?.options) {
        return;
    }

    die.options.sfx = {
        id: `${prefix}-${key}`,
        result: die.total
    };
}

function removeBrokenSfxListeners(): number {
    let removed = 0;

    for (const { hook } of SFX_HOOKS) {
        const broken = [...Hooks.events[hook] ?? []]
            .filter(({ fn }) => isSfxListener(fn) && isBrokenOnCurrentSignature(fn));

        for (const { id } of broken) {
            Hooks.off(hook, id);
            removed++;
        }
    }

    return removed;
}

function bindSfxTriggers(): void {
    for (const { hook, prefix, field } of SFX_HOOKS) {
        Hooks.on(hook, (rolls: unknown, data: unknown, legacyKey?: string) => {
            const key = getKey(data, legacyKey, field);

            // Death saves have no ability and no SFX trigger
            if (key) {
                tagDie(rolls, key, prefix);
            }
        });
    }
}

export function fixSfxTriggers(): void {
    if (game.system.id !== 'dnd5e' || !game.modules.get(SFX_MODULE)?.active) {
        return;
    }

    const removed = removeBrokenSfxListeners();

    if (!removed) {
        return;
    }

    bindSfxTriggers();
    log.info(`Shimmed ${SFX_MODULE}: replaced ${removed} listener(s) broken against dnd5e ${game.system.version}`);
}
