type NotificationLevel = 'info' | 'warn' | 'error';

type Notifier = Record<NotificationLevel, (message: string) => PostedNotification | undefined>;

function tagNotification(notification: PostedNotification, className: string): void {
    let element = notification.element;

    element?.classList.add(className);

    // Core sets element when a queued notification is shown
    Object.defineProperty(notification, 'element', {
        get: () => element,
        set: (rendered: HTMLElement) => {
            rendered.classList.add(className);
            element = rendered;
        }
    });
}

function postTagged(level: NotificationLevel, message: string, className: string): PostedNotification | undefined {
    const notification = ui.notifications?.[level](message);

    if (notification) {
        tagNotification(notification, className);
    }

    return notification;
}

export function createNotifier(moduleId: string, className = `${moduleId.toLowerCase()}-notification`): Notifier {
    return {
        info: (message) => postTagged('info', message, className),
        warn: (message) => postTagged('warn', message, className),
        error: (message) => postTagged('error', message, className)
    };
}
