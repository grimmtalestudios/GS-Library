export function createLogger(moduleId, options) {
    const config = typeof options === 'function' ? { isDebugEnabled: options } : options ?? {};
    const { isDebugEnabled, title = moduleId, style } = config;
    // %c takes its CSS from the next console argument
    const prefix = style ? [`%c${title}`, style, '|'] : [`${title} |`];
    const seen = new Set();
    let forced = null;
    const isDebugOn = () => {
        if (forced !== null) {
            return forced;
        }
        try {
            return Boolean(isDebugEnabled?.());
        }
        catch {
            // Reading a setting before it is registered throws
            return false;
        }
    };
    const logger = {
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
