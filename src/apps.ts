// V2 windows are in foundry.applications.instances, V1 windows in ui.windows
export function getOpenApps(): FoundryApp[] {
    return [...foundry.applications.instances.values(), ...Object.values(ui.windows)];
}

export function getOpenAppsOf(...classes: Function[]): FoundryApp[] {
    return getOpenApps().filter((app) => classes.some((cls) => app instanceof cls));
}

export function refreshApps(classes: Function[], force = false): number {
    const apps = getOpenAppsOf(...classes);
    apps.forEach((app) => app.render(force));

    return apps.length;
}

export async function openModuleSettings(moduleId: string): Promise<void> {
    const sheet = game.settings.sheet;
    await sheet.render({ force: true });

    // Core opens the settings window on the Core tab
    sheet.changeTab(moduleId, 'categories', { force: true });
}
