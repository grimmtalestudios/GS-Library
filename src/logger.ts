type Level = 'error' | 'warn' | 'info' | 'debug';

interface LoggerOptions {
    isDebugEnabled?: () => boolean;
    title?: string;
    style?: string;
}

export interface Logger {
    error(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    info(...args: unknown[]): void;
    debug(...args: unknown[]): void;
    fail(userMessage: string, err?: unknown): void;
    once(key: string, level: Level, ...args: unknown[]): void;
    setDebug(on: boolean): void;
}

export function createLogger(moduleId: string, options?: (() => boolean) | LoggerOptions): Logger {
    const config = typeof options === 'function' ? { isDebugEnabled: options } : options ?? {};
    const { isDebugEnabled, title = moduleId, style } = config;

    // %c takes its CSS from the next console argument
    const prefix = style ? [`%c${title}`, style, '|'] : [`${title} |`];
    const seen = new Set<string>();
    let forced: boolean | null = null;

    const isDebugOn = () => {
        if (forced !== null) {
            return forced;
        }

        try {
            return Boolean(isDebugEnabled?.());
        } catch {

            // Reading a setting before it is registered throws
            return false;
        }
    };

    const logger: Logger = {
        error: (...args) => console.error(...prefix, ...args),
        warn: (...args) => console.warn(...prefix, ...args),
        info: (...args) => console.log(...prefix, ...args),
        debug: (...args) => {
            if (isDebugOn()) {
                console.debug(...prefix, ...args);
            }
        },
        fail: (userMessage, err) => {
            console.error(...prefix, userMessage, err ?? '');

            // ui.notifications does not exist until Foundry has set up its interface
            ui.notifications?.error(`${title}: ${userMessage}`);
        },
        once: (key, level, ...args) => {
            if (seen.has(key)) {
                return;
            }

            seen.add(key);
            logger[level](...args);
        },
        setDebug: (on) => {
            forced = on;
        }
    };

    return logger;
}
