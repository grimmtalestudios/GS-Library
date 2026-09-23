function postTagged(level, message, className) {
    const notification = ui.notifications?.[level](message);
    // No element yet if the notification is queued
    notification?.element?.classList.add(className);
    return notification;
}
export function createNotifier(moduleId, className = `${moduleId.toLowerCase()}-notification`) {
    return {
        info: (message) => postTagged('info', message, className),
        warn: (message) => postTagged('warn', message, className),
        error: (message) => postTagged('error', message, className)
    };
}
