import { SetMetadata } from '@nestjs/common';
import { CacheService } from '../cache.service';
import {
    extractModuleName,
    extractEntityName,
    buildCacheKey,
} from '../utils/cache-key-builder';

const CACHE_METADATA = 'cache:method';

/**
 * Aplica cache diretamente no método usando um wrapper
 * Este decorator funciona em conjunto com o EnableCache
 */
export function applyCacheToMethod(
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
    cacheService: CacheService,
    reflector: any,
) {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;
    const writeMethods = ['create', 'update', 'save', 'delete', 'remove', 'upsert'];
    const isWriteMethod = writeMethods.some(method => 
        propertyName.toLowerCase().includes(method.toLowerCase())
    );

    descriptor.value = async function (...args: any[]) {
        // Obtém metadados
        const enableCache = Reflect.getMetadata('cache:enable', target, propertyName);
        const noCache = Reflect.getMetadata('cache:no-cache', target, propertyName);
        const cacheKey = Reflect.getMetadata('cache:key', target, propertyName);
        const cacheTtl = Reflect.getMetadata('cache:ttl', target, propertyName);
        const invalidatePatterns = Reflect.getMetadata('cache:invalidate', target, propertyName);

        // Se cache está desabilitado, apenas executa
        if (noCache) {
            return originalMethod.apply(this, args);
        }

        // Se há padrões de invalidação, executa e invalida
        if (invalidatePatterns && invalidatePatterns.length > 0) {
            const result = await originalMethod.apply(this, args);
            for (const pattern of invalidatePatterns) {
                await cacheService.delPattern(pattern);
            }
            return result;
        }

        // Se é método de escrita, executa e invalida cache relacionado
        if (isWriteMethod) {
            const result = await originalMethod.apply(this, args);
            await invalidateRelatedCache(
                cacheService,
                className,
                propertyName,
                args,
            );
            return result;
        }

        // Se cache não está habilitado, apenas executa
        if (!enableCache) {
            return originalMethod.apply(this, args);
        }

        // Extrai informações para gerar chave
        const filePath = getFilePathFromStack();
        const moduleName = extractModuleName(filePath);
        const entityName = extractEntityName(className);

        // Gera chave de cache
        const dbType = className.includes('Mongo') ? 'mongoose' : 'typeorm';
        const key = cacheKey
            ? cacheService.generateKey(`${dbType}:${moduleName}`, cacheKey, ...args)
            : buildCacheKey(dbType, moduleName, entityName, propertyName, args);

        // Tenta obter do cache
        const cached = await cacheService.get(key);
        if (cached) {
            return cached;
        }

        // Executa e armazena no cache
        const result = await originalMethod.apply(this, args);
        await cacheService.set(key, result, cacheTtl);
        return result;
    };

    return descriptor;
}

/**
 * Invalida cache relacionado após operações de escrita
 */
async function invalidateRelatedCache(
    cacheService: CacheService,
    className: string,
    methodName: string,
    args: any[],
): Promise<void> {
    let id: string | undefined;
    if (args.length > 0) {
        const firstArg = args[0];
        if (typeof firstArg === 'string') {
            id = firstArg;
        } else if (typeof firstArg === 'object' && firstArg !== null && 'id' in firstArg) {
            id = firstArg.id;
        }
    }

    const entityName = extractEntityName(className);
    const dbType = className.includes('Mongo') ? 'mongoose' : 'typeorm';
    
    const patterns = [
        `${dbType}:*:${entityName}:*`,
    ];

    if (id) {
        patterns.push(`${dbType}:*:${entityName}:findById:${id}*`);
    }

    for (const pattern of patterns) {
        await cacheService.delPattern(pattern);
    }
}

/**
 * Obtém o caminho do arquivo do stack trace
 */
function getFilePathFromStack(): string {
    const stack = new Error().stack;
    if (stack) {
        const lines = stack.split('\n');
        for (const line of lines) {
            if (line.includes('modules/') && line.includes('.repository.ts')) {
                const match = line.match(/([^\/]+\.repository\.ts)/);
                if (match) {
                    const moduleMatch = line.match(/modules\/([^\/]+)/);
                    if (moduleMatch) {
                        return `src/modules/${moduleMatch[1]}/repositories/${match[1]}`;
                    }
                }
            }
        }
    }
    return 'unknown';
}

