import { SetMetadata } from '@nestjs/common';
import 'reflect-metadata';
import { CacheService } from '../cache.service';
import {
    extractModuleName,
    extractEntityName,
    buildCacheKey,
} from '../utils/cache-key-builder';

export const CACHE_KEY = 'cache:key';
export const CACHE_TTL = 'cache:ttl';
export const NO_CACHE = 'cache:no-cache';
export const CACHE_INVALIDATE = 'cache:invalidate';
export const ENABLE_CACHE = 'cache:enable';

/**
 * Sets a custom cache key for the method
 */
export const CacheKey = (key: string) => SetMetadata(CACHE_KEY, key);

/**
 * Sets the cache TTL (Time To Live) in seconds
 */
export const CacheTTL = (ttl: number) => SetMetadata(CACHE_TTL, ttl);

/**
 * Disables cache for this method
 */
export const NoCache = () => SetMetadata(NO_CACHE, true);

/**
 * Sets key patterns to invalidate after execution
 */
export const CacheInvalidate = (...patterns: string[]) => 
    SetMetadata(CACHE_INVALIDATE, patterns);

/**
 * Enables cache on the method (selective use)
 * This decorator wraps the method to apply caching directly
 */
export function EnableCache() {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
        // Mark the method with metadata
        SetMetadata(ENABLE_CACHE, true)(target, propertyName, descriptor);
        
        // Also set on the target so metadata lookup succeeds
        Reflect.defineMetadata(ENABLE_CACHE, true, target, propertyName);
        Reflect.defineMetadata(ENABLE_CACHE, true, target.constructor.prototype, propertyName);

        const originalMethod = descriptor.value;
        const className = target.constructor.name;
        const writeMethods = [
            'create', 'update', 'save', 'delete', 'remove', 'upsert', 
            'incrementVote', 'createVote', 'softDelete',
            'markAsRead', 'markAllAsRead', 'markAsUnread',
            'pinNotification', 'unpinNotification',
            'updateSentStatus', 'deleteByIds'
        ];

        descriptor.value = async function (...args: any[]) {
            // Extract info for the cache key (moduleName and entityName needed for invalidation)
            const filePath = getFilePathFromStack();
            let moduleName = extractModuleName(filePath);
            if (moduleName === 'unknown') {
                moduleName = inferModuleNameFromClassName(className);
            }
            const entityName = extractEntityName(className);
            
            // Debug log
            console.log(`[Cache] Method ${className}.${propertyName} - moduleName: ${moduleName}, entityName: ${entityName}`);
            // Resolve CacheService via dependency injection
            // CacheService should be injected in the repository constructor
            const cacheService: CacheService | undefined = (this as any).cacheService;

            if (!cacheService) {
                // If CacheService is unavailable, run the original method
                console.warn(`[Cache] CacheService unavailable for ${className}.${propertyName} - running without cache`);
                console.warn(`[Cache] Ensure CacheService is injected in the ${className} constructor`);
                return originalMethod.apply(this, args);
            }

            // Read metadata — try multiple lookup locations
            const noCache = Reflect.getMetadata(NO_CACHE, target, propertyName) ||
                Reflect.getMetadata(NO_CACHE, target.constructor.prototype, propertyName) ||
                Reflect.getMetadata(NO_CACHE, this, propertyName) ||
                Reflect.getMetadata(NO_CACHE, this.constructor.prototype, propertyName);
            
            const cacheKey = Reflect.getMetadata(CACHE_KEY, target, propertyName) ||
                Reflect.getMetadata(CACHE_KEY, target.constructor.prototype, propertyName) ||
                Reflect.getMetadata(CACHE_KEY, this, propertyName) ||
                Reflect.getMetadata(CACHE_KEY, this.constructor.prototype, propertyName);
            
            const cacheTtl = Reflect.getMetadata(CACHE_TTL, target, propertyName) ||
                Reflect.getMetadata(CACHE_TTL, target.constructor.prototype, propertyName) ||
                Reflect.getMetadata(CACHE_TTL, this, propertyName) ||
                Reflect.getMetadata(CACHE_TTL, this.constructor.prototype, propertyName);
            
            const invalidatePatterns = Reflect.getMetadata(CACHE_INVALIDATE, target, propertyName) ||
                Reflect.getMetadata(CACHE_INVALIDATE, target.constructor.prototype, propertyName) ||
                Reflect.getMetadata(CACHE_INVALIDATE, this, propertyName) ||
                Reflect.getMetadata(CACHE_INVALIDATE, this.constructor.prototype, propertyName);

            // If cache is disabled, just run the method
            if (noCache) {
                console.log(`[Cache] Cache disabled via @NoCache for ${className}.${propertyName}`);
                return originalMethod.apply(this, args);
            }

            // If invalidation patterns exist, run then invalidate
            if (invalidatePatterns && invalidatePatterns.length > 0) {
                console.log(`[Cache] Invalidation method detected for ${className}.${propertyName}`);
                const result = await originalMethod.apply(this, args);
                for (const pattern of invalidatePatterns) {
                    await cacheService.delPattern(pattern);
                }
                return result;
            }

            // Detect write methods
            const isWriteMethod = writeMethods.some(method => 
                propertyName.toLowerCase().includes(method.toLowerCase())
            );

            if (isWriteMethod) {
                console.log(`[Cache] ✅ Write method detected for ${className}.${propertyName}`);
                const result = await originalMethod.apply(this, args);
                console.log(`[Cache] Running cache invalidation for ${className}.${propertyName}...`);
                try {
                    await invalidateRelatedCache(
                        cacheService,
                        className,
                        propertyName,
                        args,
                        moduleName,
                        entityName,
                    );
                    console.log(`[Cache] ✅ Cache invalidation completed for ${className}.${propertyName}`);
                } catch (error) {
                    console.error(`[Cache] ❌ Failed to invalidate cache for ${className}.${propertyName}:`, error);
                    // Do not fail the operation if invalidation fails
                }
                return result;
            }

            // Reaching here means cache is enabled (@EnableCache is present)
            console.log(`[Cache] Proceeding with cache for ${className}.${propertyName}`);

            // Reuse variables extracted above

            // Build cache key
            const dbType = className.includes('Mongo') ? 'mongoose' : 'typeorm';
            const key = cacheKey
                ? cacheService.generateKey(`${dbType}:${moduleName}`, cacheKey, ...args)
                : buildCacheKey(dbType, moduleName, entityName, propertyName, args);

            console.log(`[Cache] Checking cache for: ${key}`);
            console.log(`[Cache] Context: className=${className}, propertyName=${propertyName}, moduleName=${moduleName}, entityName=${entityName}`);

            // Try cache lookup
            const cached = await cacheService.get(key);
            if (cached !== null) {
                console.log(`[Cache] HIT - ${key}`);
                return cached;
            }

            // Execute and store in cache
            const result = await originalMethod.apply(this, args);
            
            // Only store valid results
            if (result !== null && result !== undefined) {
                await cacheService.set(key, result, cacheTtl);
                console.log(`[Cache] SET - ${key} - TTL: ${cacheTtl || 'default'}`);
            } else {
                console.log(`[Cache] SKIP SET - ${key} - result is null/undefined`);
            }
            return result;
        };

        return descriptor;
    };
}

/**
 * Invalidates related cache after write operations
 */
export async function invalidateRelatedCache(
    cacheService: CacheService,
    className: string,
    methodName: string,
    args: any[],
    moduleName?: string,
    entityNameParam?: string,
): Promise<void> {
    let id: string | undefined;
    if (args.length > 0) {
        const firstArg = args[0];
        if (typeof firstArg === 'string') {
            id = firstArg;
        } else if (typeof firstArg === 'object' && firstArg !== null) {
            // Try several ways to read the ID
            if ('id' in firstArg) {
                id = firstArg.id;
            } else if ('_id' in firstArg) {
                id = firstArg._id;
            }
        }
    }

    // If not provided, extract from className
    const entityName = entityNameParam || extractEntityName(className);
    const dbType = className.includes('Mongo') ? 'mongoose' : 'typeorm';
    
    // If moduleName was not provided, try to infer it
    let finalModuleName = moduleName;
    if (!finalModuleName || finalModuleName === 'unknown') {
        const filePath = getFilePathFromStack();
        finalModuleName = extractModuleName(filePath);
        if (finalModuleName === 'unknown') {
            finalModuleName = inferModuleNameFromClassName(className);
        }
    }
    
    // More specific invalidation patterns
    const patterns = [
        `${dbType}:${finalModuleName}:${entityName}:*`, // All keys for this entity in this module
    ];

    // Also invalidate list-style method keys
    patterns.push(`${dbType}:${finalModuleName}:${entityName}:findAll*`);
    patterns.push(`${dbType}:${finalModuleName}:${entityName}:findBy*`);
    patterns.push(`${dbType}:${finalModuleName}:${entityName}:count*`);

    if (id) {
        patterns.push(`${dbType}:${finalModuleName}:${entityName}:findById:${id}*`);
        patterns.push(`${dbType}:${finalModuleName}:${entityName}:findById:${id}`);
    }

    console.log(`[Cache] 🔄 Invalidating cache with ${patterns.length} patterns: ${patterns.join(', ')}`);
    console.log(`[Cache] Context: moduleName=${finalModuleName}, entityName=${entityName}, dbType=${dbType}, id=${id || 'N/A'}`);
    
    for (const pattern of patterns) {
        try {
            await cacheService.delPattern(pattern);
        } catch (error) {
            console.error(`[Cache] ❌ Failed to invalidate pattern ${pattern}:`, error);
        }
    }
    
    console.log(`[Cache] ✅ Cache invalidation completed`);
}

/**
 * Infers the module name from the class name
 */
function inferModuleNameFromClassName(className: string): string {
    const classNameLower = className.toLowerCase();
    
    // Keyword-to-module-name mapping
    // IMPORTANT: Order matters — more specific keywords first
    const moduleMap: { [key: string]: string } = {
        'facility_reservation': 'facility_reservations',
        'facilityreservation': 'facility_reservations',
        'condominium_invoice': 'condominium_invoices',
        'condominiuminvoice': 'condominium_invoices',
        'condominium_chat': 'condominium_chat',
        'condominiumchat': 'condominium_chat',
        'condominium_billing_preference': 'condominium_billing_preferences',
        'condominiumbillingpreference': 'condominium_billing_preferences',
        'condominium_rule': 'condominium_rules',
        'condominiumrule': 'condominium_rules',
        'occurrence_chat': 'occurrence_chat',
        'occurrencechat': 'occurrence_chat',
        'service_chat': 'service_chat',
        'servicechat': 'service_chat',
        'assembly_minute': 'assembly_minutes',
        'assemblyminute': 'assembly_minutes',
        'provider_review': 'provider_reviews',
        'providerreview': 'provider_reviews',
        'maintenance_record': 'maintenance_records',
        'maintenancerecord': 'maintenance_records',
        'finance_report': 'finance_reports',
        'financereport': 'finance_reports',
        'notification_preference': 'notification_preferences',
        'notificationpreference': 'notification_preferences',
        'visitor_entry': 'visitor_entries',
        'visitorentry': 'visitor_entries',
        'service_invoice': 'service_invoices',
        'serviceinvoice': 'service_invoices',
        'notification': 'notifications',
        'user': 'users',
        'condominium': 'condominiums',
        'voting': 'votings',
        'accountant': 'accountants',
        'visitor': 'visitors',
        'unit': 'units',
        'service': 'services',
        'resident': 'residents',
        'customer': 'customers',
        'manager': 'managers',
        'building': 'buildings',
        'gate': 'gates',
        'facility': 'facilities',
        'cleaner': 'cleaners',
        'concierge': 'concierges',
        'provider': 'providers',
        'expense': 'expenses',
        'income': 'incomes',
        'occurrence': 'occurrences',
        'assembly': 'assemblies',
        'billing': 'billing',
        'document': 'documents',
        'dispute': 'disputes',
        'event': 'events',
        'package': 'packages',
        'statistic': 'statistics',
        'finance': 'finance_reports',
        'employee': 'employees',
    };
    
    // Match keywords in the class name (order matters — more specific first)
    const sortedKeys = Object.keys(moduleMap).sort((a, b) => b.length - a.length);
    for (const keyword of sortedKeys) {
        if (classNameLower.includes(keyword)) {
            return moduleMap[keyword];
        }
    }
    
    // If no match, derive from the class name pattern
    // Ex: FacilityReservationPostgresRepository -> facility_reservations
    let inferred = className
        .replace(/PostgresRepository$/, '')
        .replace(/MongoRepository$/, '')
        .replace(/Repository$/, '');
    
    // Convert PascalCase to snake_case
    inferred = inferred.replace(/([A-Z])/g, '_$1').toLowerCase();
    inferred = inferred.replace(/^_/, '');
    
    // Normalize (pluralize if needed)
    return normalizeModuleName(inferred);
}

/**
 * Normalizes the module name (pluralizes if needed)
 */
function normalizeModuleName(moduleName: string): string {
    // Modules that should be plural
    const pluralModules = [
        'notifications', 'users', 'condominiums', 'votings', 'accountants',
        'visitors', 'units', 'services', 'residents', 'customers', 'managers',
        'buildings', 'gates', 'facilities', 'cleaners', 'concierges', 'providers',
        'expenses', 'incomes', 'occurrences', 'assemblies', 'documents',
        'disputes', 'events', 'packages', 'statistics', 'employees',
        'facility_reservations', 'condominium_invoices', 'condominium_chat',
        'condominium_billing_preferences', 'condominium_rules', 'occurrence_chat',
        'service_chat', 'assembly_minutes', 'provider_reviews', 'maintenance_records',
        'finance_reports', 'notification_preferences', 'visitor_entries', 'service_invoices'
    ];
    
    // If already plural, return as-is
    if (pluralModules.includes(moduleName)) {
        return moduleName;
    }
    
    // Try to pluralize
    if (moduleName.endsWith('y')) {
        return moduleName.slice(0, -1) + 'ies';
    } else if (moduleName.endsWith('s') || moduleName.endsWith('x') || moduleName.endsWith('ch') || moduleName.endsWith('sh')) {
        return moduleName + 'es';
    } else {
        return moduleName + 's';
    }
}

/**
 * Resolves a file path from the stack trace
 */
function getFilePathFromStack(): string {
    const stack = new Error().stack;
    if (stack) {
        const lines = stack.split('\n');
        for (const line of lines) {
            if (line.includes('modules/') && (line.includes('.repository.ts') || line.includes('.service.ts'))) {
                const moduleMatch = line.match(/modules\/([^\/]+)\//);
                if (moduleMatch) {
                    const fileMatch = line.match(/([^\/]+\.(repository|service)\.ts)/);
                    if (fileMatch) {
                        const moduleName = moduleMatch[1];
                        const fileName = fileMatch[1];
                        const fileType = fileName.includes('.repository.') ? 'repositories' : '';
                        if (fileType) {
                            return `src/modules/${moduleName}/${fileType}/${fileName}`;
                        } else {
                            return `src/modules/${moduleName}/${fileName}`;
                        }
                    }
                }
            }
        }
    }
    return 'unknown';
}

