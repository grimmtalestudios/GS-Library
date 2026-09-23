export function getGeneration() {
    return Number(game.version.split('.')[0]);
}
export function isAtLeast(generation) {
    return getGeneration() >= generation;
}
// Systems and modules can replace TextEditor and FilePicker during init
export function getTextEditor() {
    return foundry.applications.ux.TextEditor.implementation;
}
export function getFilePicker() {
    return foundry.applications.apps.FilePicker.implementation;
}
export function getDialogV2() {
    return foundry.applications.api.DialogV2;
}
export function getFormDataExtended() {
    return foundry.applications.ux.FormDataExtended;
}
export function getDragData(event) {
    return getTextEditor().getDragEventData(event);
}
export async function confirmDialog({ title, content, yesLabel, noLabel }) {
    const confirmed = await getDialogV2().confirm({
        window: { title },
        content,
        yes: yesLabel ? { label: yesLabel } : {},
        no: noLabel ? { label: noLabel } : {}
    });
    return Boolean(confirmed);
}
// Render hooks on ApplicationV1 windows pass jQuery
export function toElement(html) {
    if (html instanceof HTMLElement) {
        return html;
    }
    const first = html?.[0];
    return first instanceof HTMLElement ? first : null;
}
