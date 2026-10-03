const lastWrites = new Map<string, Promise<unknown>>();

export function queueWrite<T>(key: string, write: () => Promise<T>): Promise<T> {
    const queued = (lastWrites.get(key) ?? Promise.resolve()).then(write);

    lastWrites.set(key, queued.catch(() => undefined)); // a failed write doesn't block the next

    return queued;
}
