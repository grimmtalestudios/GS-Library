import { toAppearance, toLook } from './appearance.js';
import { MODULE_ID } from './constants.js';
import { readSetting, writeSetting } from './settings.js';
import type { Appearance } from './tokens.js';

interface Preset extends Required<Appearance> {
    id: string;
    name: string;
}

const PRESETS = 'appearancePresets';

function toName(value: unknown): string {
    return String(value ?? '').trim().slice(0, 40);
}

function toPreset(raw: unknown): Preset {
    const entry = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

    return {
        id: String(entry.id ?? ''),
        name: toName(entry.name),
        ...toLook(entry)
    };
}

// Date.now() alone repeats within a millisecond
function createPresetId(): string {
    return `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function registerPresetSetting(): void {
    game.settings.register(MODULE_ID, PRESETS, {
        scope: 'client',
        config: false,
        type: Array,
        default: []
    });
}

export function listPresets(): Preset[] {
    const stored = readSetting<unknown>(MODULE_ID, PRESETS, []);

    return (Array.isArray(stored) ? stored : []).map(toPreset).filter((preset) => preset.id && preset.name);
}

export async function savePreset(name: unknown, look: unknown): Promise<unknown> {
    const label = toName(name);

    if (!label) {
        return undefined;
    }

    const presets = listPresets();
    const existing = presets.findIndex((preset) => preset.name.toLowerCase() === label.toLowerCase());
    const preset = toPreset({
        ...toAppearance(look),
        id: presets[existing]?.id ?? createPresetId(),
        name: label
    });

    if (existing >= 0) {
        presets[existing] = preset;
    } else {
        presets.push(preset);
    }

    return writeSetting(MODULE_ID, PRESETS, presets);
}

export async function deletePreset(id: string): Promise<unknown> {
    return writeSetting(MODULE_ID, PRESETS, listPresets().filter((preset) => preset.id !== id));
}
