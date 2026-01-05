import * as crypto from 'crypto';

/**
 * Extrai o nome do módulo do caminho do arquivo
 * Exemplo: src/modules/users/repositories/postgres.repository.ts -> users
 */
export function extractModuleName(filePath: string): string {
    const modulesMatch = filePath.match(/modules\/([^\/]+)/);
    if (modulesMatch && modulesMatch[1]) {
        return normalizeModuleName(modulesMatch[1]);
    }
    return 'unknown';
}

/**
 * Normaliza o nome do módulo
 * - Converte para lowercase
 * - Substitui hífens por underscores
 */
export function normalizeModuleName(moduleName: string): string {
    return moduleName.toLowerCase().replace(/-/g, '_');
}

/**
 * Extrai o nome da entidade do nome da classe do repositório
 * Exemplo: UserPostgresRepository -> user
 * Exemplo: CondominiumInvoiceMongoRepository -> condominium_invoice
 */
export function extractEntityName(className: string): string {
    let entityName = className;
    
    // Remove sufixos comuns
    entityName = entityName.replace(/PostgresRepository$/, '');
    entityName = entityName.replace(/MongoRepository$/, '');
    entityName = entityName.replace(/Repository$/, '');
    
    // Converte PascalCase para snake_case
    entityName = entityName.replace(/([A-Z])/g, '_$1').toLowerCase();
    entityName = entityName.replace(/^_/, ''); // Remove underscore inicial
    
    return entityName;
}

/**
 * Normaliza parâmetros para uso em chaves de cache
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
                // Ordena chaves do objeto para garantir consistência
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
 * Gera hash para parâmetros muito longos
 */
export function hashParams(params: string): string {
    return crypto.createHash('md5').update(params).digest('hex').substring(0, 16);
}

/**
 * Constrói uma chave de cache completa com namespacing
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

