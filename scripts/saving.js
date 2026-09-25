// Mark busy while saving so a second click doesn't undo the first
export function markSaving(control) {
    control.ariaBusy = 'true';
}
export function clearSaving(control) {
    control.ariaBusy = null;
}
export function isSaving(control) {
    return control.closest('[aria-busy="true"]') !== null;
}
export async function whileSaving(control, write) {
    markSaving(control);
    try {
        return await write();
    }
    finally {
        clearSaving(control);
    }
}
