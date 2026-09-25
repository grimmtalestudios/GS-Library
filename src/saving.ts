// Mark busy while saving so a second click doesn't undo the first
export function markSaving(control: HTMLElement): void {
    control.ariaBusy = 'true';
}

export function clearSaving(control: HTMLElement): void {
    control.ariaBusy = null;
}

export function isSaving(control: HTMLElement): boolean {
    return control.closest('[aria-busy="true"]') !== null;
}

export async function whileSaving<T>(control: HTMLElement, write: () => Promise<T>): Promise<T> {
    markSaving(control);

    try {
        return await write();
    } finally {
        clearSaving(control);
    }
}
