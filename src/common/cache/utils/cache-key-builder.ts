import * as crypto from 'crypto';

/**
 * Extracts the module name from the file path
 * Example: src/modules/users/repositories/postgres.repository.ts -> users
 */
export function extractModuleName(filePath: string): string {
    const modulesMatch = filePath.match(/modules\/([^\/]+)/);
    if (modulesMatch && modulesMatch[1]) {
        return normalizeModuleName(modulesMatch[1]);
    }
    return 'unknown';
}

/**
 * Normalizes the module name
 * - Converts to lowercase
 * - Replaces hyphens with underscores
 */
export function normalizeModuleName(moduleName: string): string {
    return moduleName.toLowerCase().replace(/-/g, '_');
}

/**
 * Extracts the entity name from the repository class name
 * Example: UserPostgresRepository -> user
 * Example: CondominiumInvoiceMongoRepository -> condominium_invoice
 */
export function extractEntityName(className: string): string {
    let entityName = className;
    
    // Remove common suffixes
    entityName = entityName.replace(/PostgresRepository$/, '');
    entityName = entityName.replace(/MongoRepository$/, '');
    entityName = entityName.replace(/Repository$/, '');
    
    // Convert PascalCase to snake_case
    entityName = entityName.replace(/([A-Z])/g, '_$1').toLowerCase();
    entityName = entityName.replace(/^_/, ''); // Remove leading underscore
    
    return entityName;
}

/**
 * Normalizes parameters for use in cache keys
 */
export function normalizeParams(...params: any[]): string {
    return params
        .map(p => {
            if (p === null || p === undefined) {
                return 'null';
            }
            if (typeof p === 'string' || typeof p === 'number' || typeof p === 'boolean') {
                return String(p);
            }
            if (typeof p === 'object') {
                // Sort object keys for consistency
                const sorted = Object.keys(p)
                    .sort()
                    .reduce((acc, key) => {
                        acc[key] = p[key];
                        return acc;
                    }, {} as any);
                return JSON.stringify(sorted);
            }
            return String(p);
        })
        .join(':');
}

/**
 * Hashes very long parameter strings
 */
export function hashParams(params: string): string {
    return crypto.createHash('md5').update(params).digest('hex').substring(0, 16);
}

/**
 * Builds a fully namespaced cache key
 */
export function buildCacheKey(
    dbType: 'typeorm' | 'mongoose',
    moduleName: string,
    entityName: string,
    methodName: string,
    params: any[] = [],
): string {
    const normalizedParams = normalizeParams(...params);
    const paramsHash = normalizedParams.length > 100 
        ? hashParams(normalizedParams) 
        : normalizedParams;
    
    return `${dbType}:${moduleName}:${entityName}:${methodName}:${paramsHash}`;
}

