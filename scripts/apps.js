// V2 windows are in foundry.applications.instances, V1 windows in ui.windows
export function getOpenApps() {
    return [...foundry.applications.instances.values(), ...Object.values(ui.windows)];
}
export function getOpenAppsOf(...classes) {
    return getOpenApps().filter((app) => classes.some((cls) => app instanceof cls));
}
export function refreshApps(classes, force = false) {
    const apps = getOpenAppsOf(...classes);
    apps.forEach((app) => app.render(force));
    return apps.length;
}
export async function openModuleSettings(moduleId) {
    const sheet = game.settings.sheet;
    await sheet.render({ force: true });
    const tab = sheet.element.querySelector(`.tabs [data-group="categories"][data-tab="${moduleId}"]`);
    // No tab if this user can't see any of the module's settings
    if (!tab) {
        return;
    }
    // Core opens the settings window on the Core tab
    sheet.changeTab(moduleId, 'categories', { force: true });
}
