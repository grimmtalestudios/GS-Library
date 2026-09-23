type NotificationLevel = 'info' | 'warn' | 'error';

type Notifier = Record<NotificationLevel, (message: string) => PostedNotification | undefined>;

function postTagged(level: NotificationLevel, message: string, className: string): PostedNotification | undefined {
    const notification = ui.notifications?.[level](message);

    // No element yet if the notification is queued
    notification?.element?.classList.add(className);

    return notification;
}

export function createNotifier(moduleId: string, className = `${moduleId.toLowerCase()}-notification`): Notifier {
    return {
        info: (message) => postTagged('info', message, className),
        warn: (message) => postTagged('warn', message, className),
        error: (message) => postTagged('error', message, className)
    };
}
