export function keyList(raw) {
    if (!Array.isArray(raw)) {
        return [];
    }
    // Drop the [''] an empty multi-select submits
    return [...new Set(raw.map((key) => String(key ?? '').trim()).filter(Boolean))];
}
