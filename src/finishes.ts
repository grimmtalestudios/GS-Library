interface Finish {
    label: string;
    alpha: number;
    image: string;
    backdrop: string;
}

export const DEFAULT_FINISH = 'flat';

function finishesFor(isDark: boolean): Record<string, Finish> {
    const sheen = isDark ? '255, 255, 255' : '23, 21, 15';
    const at = (alpha: number): string => `rgba(${sheen}, ${alpha})`;
    const clear = at(0);

    return {
        flat: {
            label: 'Flat',
            alpha: 1,
            image: '',
            backdrop: ''
        },
        glossy: {
            label: 'Glossy',
            alpha: 1,
            image: `linear-gradient(180deg, ${at(0.08)} 0%, ${at(0.02)} 38%, ${clear} 60%)`,
            backdrop: ''
        },
        metallic: {
            label: 'Metallic',
            alpha: 1,
            image: `repeating-linear-gradient(100deg, ${at(0.045)} 0px, ${at(0.045)} 1px, ${clear} 1px, ${clear} 4px), `
                + `linear-gradient(160deg, ${at(0.1)} 0%, ${clear} 55%)`,
            backdrop: ''
        },
        glassy: {
            label: 'Glassy',
            alpha: 0.72,
            image: `linear-gradient(180deg, ${at(0.06)} 0%, ${clear} 55%)`,
            backdrop: 'blur(12px) saturate(115%)'
        },
        translucent: {
            label: 'Translucent',
            alpha: 0.82,
            image: '',
            backdrop: ''
        }
    };
}

export function isFinish(key: unknown): boolean {
    return Object.hasOwn(finishesFor(true), String(key));
}

export function finishFor(key: unknown, isDark: boolean): Finish {
    const table = finishesFor(isDark);

    return isFinish(key) ? table[String(key)] : table[DEFAULT_FINISH];
}
