const lastWrites = new Map();
export function queueWrite(key, write) {
    const queued = (lastWrites.get(key) ?? Promise.resolve()).then(write);
    lastWrites.set(key, queued.catch(() => undefined)); // a failed write doesn't block the next
    return queued;
}
