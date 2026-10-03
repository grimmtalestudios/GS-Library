function tagNotification(notification, className) {
    let element = notification.element;
    element?.classList.add(className);
    // Core sets element when a queued notification is shown
    Object.defineProperty(notification, 'element', {
        get: () => element,
        set: (rendered) => {
            rendered.classList.add(className);
            element = rendered;
        }
    });
}
function postTagged(level, message, className) {
    const notification = ui.notifications?.[level](message);
    if (notification) {
        tagNotification(notification, className);
    }
    return notification;
}
export function createNotifier(moduleId, className = `${moduleId.toLowerCase()}-notification`) {
    return {
        info: (message) => postTagged('info', message, className),
        warn: (message) => postTagged('warn', message, className),
        error: (message) => postTagged('error', message, className)
    };
}
