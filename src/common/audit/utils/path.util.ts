/**
 * Reads a nested value from an object using a dot path (e.g. `user.id`).
 */
export function getByPath(source: unknown, path: string): unknown {
    if (source == null || !path) {
        return undefined;
    }
    const parts = path.split('.');
    let current: unknown = source;
    for (const part of parts) {
        if (current == null || typeof current !== 'object') {
            return undefined;
        }
        current = (current as Record<string, unknown>)[part];
    }
    return current;
}

export function firstStringFromPaths(
    source: unknown,
    paths: string | string[] | undefined,
): string | undefined {
    if (!paths) {
        return undefined;
    }
    const list = Array.isArray(paths) ? paths : [paths];
    for (const path of list) {
        const value = getByPath(source, path);
        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
    }
    return undefined;
}
