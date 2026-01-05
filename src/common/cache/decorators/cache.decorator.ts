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
 * Define uma chave de cache personalizada para o método
 */
export const CacheKey = (key: string) => SetMetadata(CACHE_KEY, key);

/**
 * Define o TTL (Time To Live) do cache em segundos
 */
export const CacheTTL = (ttl: number) => SetMetadata(CACHE_TTL, ttl);

/**
 * Desabilita o cache para este método
 */
export const NoCache = () => SetMetadata(NO_CACHE, true);

/**
 * Define padrões de chaves para invalidar após a execução
 */
export const CacheInvalidate = (...patterns: string[]) => 
    SetMetadata(CACHE_INVALIDATE, patterns);

/**
 * Habilita o cache no método (para uso seletivo)
 * Este decorator modifica o método para aplicar cache diretamente
 */
export function EnableCache() {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
        // Marca o método com metadata
        SetMetadata(ENABLE_CACHE, true)(target, propertyName, descriptor);
        
        // Também define diretamente no target para garantir que seja encontrado
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
            // Extrai informações para gerar chave (precisamos do moduleName e entityName para invalidação)
            const filePath = getFilePathFromStack();
            let moduleName = extractModuleName(filePath);
            if (moduleName === 'unknown') {
                moduleName = inferModuleNameFromClassName(className);
            }
            const entityName = extractEntityName(className);
            // Obtém CacheService via injeção de dependência
            // O CacheService deve ser injetado no construtor do repositório
            const cacheService: CacheService | undefined = (this as any).cacheService;

            if (!cacheService) {
                // Se não há CacheService disponível, apenas executa o método original
                console.warn(`[Cache] CacheService não disponível para ${className}.${propertyName} - executando sem cache`);
                console.warn(`[Cache] Verifique se CacheService está sendo injetado no construtor de ${className}`);
                return originalMethod.apply(this, args);
            }

            // Obtém metadados - tenta múltiplas formas de acessar
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

            // Se cache está desabilitado, apenas executa
            if (noCache) {
                console.log(`[Cache] Cache desabilitado via @NoCache para ${className}.${propertyName}`);
                return originalMethod.apply(this, args);
            }

            // Se há padrões de invalidação, executa e invalida
            if (invalidatePatterns && invalidatePatterns.length > 0) {
                console.log(`[Cache] Método de invalidação detectado para ${className}.${propertyName}`);
                const result = await originalMethod.apply(this, args);
                for (const pattern of invalidatePatterns) {
                    await cacheService.delPattern(pattern);
                }
                return result;
            }

            // Detecta se é método de escrita
            const isWriteMethod = writeMethods.some(method => 
                propertyName.toLowerCase().includes(method.toLowerCase())
            );

            if (isWriteMethod) {
                console.log(`[Cache] Método de escrita detectado para ${className}.${propertyName}`);
                const result = await originalMethod.apply(this, args);
                await invalidateRelatedCache(
                    cacheService,
                    className,
                    propertyName,
                    args,
                    moduleName,
                    entityName,
                );
                return result;
            }

            // Se chegou aqui, o cache está habilitado (o decorator @EnableCache está presente)
            console.log(`[Cache] Prosseguindo com cache para ${className}.${propertyName}`);

            // Reutiliza as variáveis já extraídas acima

            // Gera chave de cache
            const dbType = className.includes('Mongo') ? 'mongoose' : 'typeorm';
            const key = cacheKey
                ? cacheService.generateKey(`${dbType}:${moduleName}`, cacheKey, ...args)
                : buildCacheKey(dbType, moduleName, entityName, propertyName, args);

            console.log(`[Cache] Verificando cache para: ${key}`);
            console.log(`[Cache] Contexto: className=${className}, propertyName=${propertyName}, moduleName=${moduleName}, entityName=${entityName}`);

            // Tenta obter do cache
            const cached = await cacheService.get(key);
            if (cached !== null) {
                console.log(`[Cache] HIT - ${key}`);
                return cached;
            }

            // Executa e armazena no cache
            const result = await originalMethod.apply(this, args);
            
            // Verifica se o resultado é válido antes de armazenar
            if (result !== null && result !== undefined) {
                await cacheService.set(key, result, cacheTtl);
                console.log(`[Cache] SET - ${key} - TTL: ${cacheTtl || 'default'}`);
            } else {
                console.log(`[Cache] SKIP SET - ${key} - resultado é null/undefined`);
            }
            return result;
        };

        return descriptor;
    };
}

/**
 * Invalida cache relacionado após operações de escrita
 */
async function invalidateRelatedCache(
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
            // Tenta obter o ID de várias formas
            if ('id' in firstArg) {
                id = firstArg.id;
            } else if ('_id' in firstArg) {
                id = firstArg._id;
            }
        }
    }

    // Se não foi passado, extrai do className
    const entityName = entityNameParam || extractEntityName(className);
    const dbType = className.includes('Mongo') ? 'mongoose' : 'typeorm';
    
    // Se moduleName não foi passado, tenta inferir
    let finalModuleName = moduleName;
    if (!finalModuleName || finalModuleName === 'unknown') {
        const filePath = getFilePathFromStack();
        finalModuleName = extractModuleName(filePath);
        if (finalModuleName === 'unknown') {
            finalModuleName = inferModuleNameFromClassName(className);
        }
    }
    
    // Padrões de invalidação mais específicos
    const patterns = [
        `${dbType}:${finalModuleName}:${entityName}:*`, // Todas as chaves desta entidade neste módulo
    ];

    // Invalida também métodos específicos que podem retornar listas
    patterns.push(`${dbType}:${finalModuleName}:${entityName}:findAll*`);
    patterns.push(`${dbType}:${finalModuleName}:${entityName}:findBy*`);
    patterns.push(`${dbType}:${finalModuleName}:${entityName}:count*`);

    if (id) {
        patterns.push(`${dbType}:${finalModuleName}:${entityName}:findById:${id}*`);
        patterns.push(`${dbType}:${finalModuleName}:${entityName}:findById:${id}`);
    }

    console.log(`[Cache] Invalidando cache com padrões: ${patterns.join(', ')}`);
    for (const pattern of patterns) {
        await cacheService.delPattern(pattern);
    }
}

/**
 * Infere o nome do módulo a partir do nome da classe
 */
function inferModuleNameFromClassName(className: string): string {
    const classNameLower = className.toLowerCase();
    
    // Mapeamento de palavras-chave para nomes de módulos
    // IMPORTANTE: Ordem importa! Palavras-chave mais específicas devem vir primeiro
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
    
    // Procura por palavras-chave no nome da classe (ordem importa - mais específico primeiro)
    const sortedKeys = Object.keys(moduleMap).sort((a, b) => b.length - a.length);
    for (const keyword of sortedKeys) {
        if (classNameLower.includes(keyword)) {
            return moduleMap[keyword];
        }
    }
    
    // Se não encontrou, tenta extrair do padrão do nome da classe
    // Ex: FacilityReservationPostgresRepository -> facility_reservations
    let inferred = className
        .replace(/PostgresRepository$/, '')
        .replace(/MongoRepository$/, '')
        .replace(/Repository$/, '');
    
    // Converte PascalCase para snake_case
    inferred = inferred.replace(/([A-Z])/g, '_$1').toLowerCase();
    inferred = inferred.replace(/^_/, '');
    
    // Normaliza (pluraliza se necessário)
    return normalizeModuleName(inferred);
}

/**
 * Normaliza o nome do módulo (pluraliza se necessário)
 */
function normalizeModuleName(moduleName: string): string {
    // Lista de módulos que devem estar no plural
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
    
    // Se já está no plural, retorna como está
    if (pluralModules.includes(moduleName)) {
        return moduleName;
    }
    
    // Tenta pluralizar
    if (moduleName.endsWith('y')) {
        return moduleName.slice(0, -1) + 'ies';
    } else if (moduleName.endsWith('s') || moduleName.endsWith('x') || moduleName.endsWith('ch') || moduleName.endsWith('sh')) {
        return moduleName + 'es';
    } else {
        return moduleName + 's';
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

