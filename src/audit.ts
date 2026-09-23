import { contrast } from './colour.js';

interface Pairing {
    key: string;
    label: string;
    ratio: number;
    target: number;
    passes: boolean;
}

interface Score {
    score: number;
    verdict: 'excellent' | 'good' | 'poor';
    weakest: string;
    failing: number;
}

const COMFORT_CAP = 1.4; // cap per pair so high contrast doesn't inflate the average
const EXCELLENT_SCORE = 90;

function toHundredths(value: number): number {
    return Math.round(value * 100) / 100;
}

function headroomOf(pairing: Pairing): number {
    return pairing.ratio / pairing.target;
}

function verdictFor(score: number, failing: number): Score['verdict'] {
    if (failing) {
        return 'poor';
    }

    return score >= EXCELLENT_SCORE ? 'excellent' : 'good';
}

export function auditTokens(tokens: Record<string, string>): Pairing[] {
    const bg = tokens['--gs-bg'];
    const header = tokens['--gs-header'] ?? bg;

    // WCAG AA: 4.5:1 for text, 3:1 for borders and fills
    const rows: [string, string, string, string, number][] = [
        ['ink', 'Body text', tokens['--gs-ink'], bg, 4.5],
        ['muted', 'Secondary text', tokens['--gs-muted'], bg, 4.5],
        ['faint', 'Quietest text', tokens['--gs-faint'], bg, 4.5],
        ['title', 'Window titles', tokens['--gs-title'], header, 4.5],
        ['accent', 'Accent, borders and fills', tokens['--gs-accent'], bg, 3],
        ['accent-strong', 'Accent as text', tokens['--gs-accent-strong'], bg, 4.5],
        ['good', 'Success', tokens['--gs-good'], bg, 3],
        ['warn', 'Caution', tokens['--gs-warn'], bg, 3],
        ['bad', 'Error', tokens['--gs-bad'], bg, 3]
    ];

    return rows.map(([key, label, value, ground, target]) => {
        const ratio = contrast(String(value), ground);

        return {
            key,
            label,
            ratio: toHundredths(ratio),
            target,
            passes: ratio >= target
        };
    });
}

export function scoreTokens(tokens: Record<string, string>): Score {
    const rows = auditTokens(tokens);
    const headroom = rows.map((row) => Math.min(COMFORT_CAP, headroomOf(row)));
    const total = headroom.reduce((sum, value) => sum + value, 0);
    const score = Math.round((100 * total) / (rows.length * COMFORT_CAP));
    const failing = rows.filter((row) => !row.passes).length;
    const weakest = rows.reduce((worst, row) => (headroomOf(row) < headroomOf(worst) ? row : worst));

    return {
        score,
        verdict: verdictFor(score, failing),
        weakest: weakest.label,
        failing
    };
}
