import { SetMetadata } from '@nestjs/common';
import 'reflect-metadata';
import { CacheService } from '../cache.service';
import { buildCacheKey } from '../utils/cache-key-builder';

export const CACHE_KEY = 'cache:key';
export const CACHE_TTL = 'cache:ttl';
export const NO_CACHE = 'cache:no-cache';
export const CACHE_INVALIDATE = 'cache:invalidate';
export const ENABLE_CACHE = 'cache:enable';

export const CacheKey = (key: string) => SetMetadata(CACHE_KEY, key);
export const CacheTTL = (ttl: number) => SetMetadata(CACHE_TTL, ttl);
export const NoCache = () => SetMetadata(NO_CACHE, true);
export const CacheInvalidate = (...patterns: string[]) => SetMetadata(CACHE_INVALIDATE, patterns);

const WRITE_METHOD_PREFIXES = [
  'create', 'update', 'save', 'delete', 'remove', 'upsert',
  'incrementVote', 'createVote', 'softDelete', 'markAs', 'updateSent', 'deleteBy',
];

function isWriteMethod(name: string): boolean {
  const lower = name.toLowerCase();
  return WRITE_METHOD_PREFIXES.some((p) => lower.startsWith(p.toLowerCase()));
}

function getModuleFromClassName(className: string): string {
  const moduleMap: Record<string, string> = {
    facilityreservation: 'facility_reservations',
    condominiuminvoice: 'condominium_invoices',
    condominiumchat: 'condominium_chat',
    condominiumbillingpreference: 'condominium_billing_preferences',
    condominiumrule: 'condominium_rules',
    occurrencechat: 'occurrence_chat',
    servicechat: 'service_chat',
    assemblyminute: 'assembly_minutes',
    providerreview: 'provider_reviews',
    maintenancerecord: 'maintenance_records',
    financereport: 'finance_reports',
    notificationpreference: 'notification_preferences',
    visitorentry: 'visitor_entries',
    serviceinvoice: 'service_invoices',
    notification: 'notifications',
    user: 'users',
    condominium: 'condominiums',
    voting: 'votings',
    accountant: 'accountants',
    visitor: 'visitors',
    unit: 'units',
    service: 'services',
    resident: 'residents',
    customer: 'customers',
    manager: 'managers',
    building: 'buildings',
    gate: 'gates',
    facility: 'facilities',
    cleaner: 'cleaners',
    concierge: 'concierges',
    provider: 'providers',
    expense: 'expenses',
    income: 'incomes',
    occurrence: 'occurrences',
    assembly: 'assemblies',
    billing: 'billing',
    document: 'documents',
    dispute: 'disputes',
    event: 'events',
    package: 'packages',
    statistic: 'statistics',
    employee: 'employees',
  };

  const stripped = className
    .replace(/PostgresRepository$/, '')
    .replace(/MongoRepository$/, '')
    .replace(/Repository$/, '')
    .replace(/Service$/, '')
    .toLowerCase();

  const sortedKeys = Object.keys(moduleMap).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (stripped.includes(key)) return moduleMap[key];
  }

  const snake = stripped.replace(/([A-Z])/g, '_$1').replace(/^_/, '');
  const knownPlurals = new Set(Object.values(moduleMap));
  if (knownPlurals.has(snake)) return snake;
  if (snake.endsWith('y')) return `${snake.slice(0, -1)}ies`;
  if (snake.endsWith('x') || snake.endsWith('ch') || snake.endsWith('sh') || snake.endsWith('s')) return `${snake}es`;
  return `${snake}s`;
}

function extractIdFromArgs(args: unknown[]): string | undefined {
  const first = args[0];
  if (typeof first === 'string') return first;
  if (first && typeof first === 'object') {
    const obj = first as Record<string, unknown>;
    if (typeof obj['id'] === 'string') return obj['id'];
    if (typeof obj['_id'] === 'string') return obj['_id'];
  }
  return undefined;
}

export function EnableCache() {
  return function (target: object, propertyName: string, descriptor: PropertyDescriptor) {
    SetMetadata(ENABLE_CACHE, true)(target, propertyName, descriptor);
    Reflect.defineMetadata(ENABLE_CACHE, true, target, propertyName);

    const originalMethod = descriptor.value as (...args: unknown[]) => Promise<unknown>;
    const className = (target as { constructor: { name: string } }).constructor.name;
    descriptor.value = async function (...args: unknown[]) {
      const cacheService: CacheService | undefined = (this as { cacheService?: CacheService }).cacheService;

      if (!cacheService) {
        return originalMethod.apply(this, args);
      }

      const meta = (key: string) =>
        Reflect.getMetadata(key, target, propertyName) ??
        Reflect.getMetadata(key, (target as { constructor: { prototype: object } }).constructor.prototype, propertyName);

      const noCache = meta(NO_CACHE);
      if (noCache) return originalMethod.apply(this, args);

      const invalidatePatterns: string[] | undefined = meta(CACHE_INVALIDATE);
      if (invalidatePatterns?.length) {
        const result = await originalMethod.apply(this, args);
        for (const pattern of invalidatePatterns) {
          await cacheService.delPattern(pattern);
        }
        return result;
      }

      if (isWriteMethod(propertyName)) {
        const result = await originalMethod.apply(this, args);
        const moduleName = getModuleFromClassName(className);
        const dbType = className.toLowerCase().includes('mongo') ? 'mongoose' : 'typeorm';
        try {
          await cacheService.delPattern(`${dbType}:${moduleName}:*`);
          const id = extractIdFromArgs(args);
          if (id) {
            await cacheService.delPattern(`${dbType}:${moduleName}:*:findById:${id}*`);
          }
        } catch (err) {
          console.warn(`Cache invalidation failed after ${propertyName}`, err);
        }
        return result;
      }

      const cacheKeyMeta: string | undefined = meta(CACHE_KEY);
      const cacheTtl: number | undefined = meta(CACHE_TTL);
      const moduleName = getModuleFromClassName(className);
      const dbType = className.toLowerCase().includes('mongo') ? 'mongoose' : 'typeorm';
      const entity = className
        .replace(/PostgresRepository$/, '')
        .replace(/MongoRepository$/, '')
        .replace(/Repository$/, '')
        .toLowerCase();

      const key = cacheKeyMeta
        ? cacheService.generateKey(`${dbType}:${moduleName}`, cacheKeyMeta, ...args)
        : buildCacheKey(dbType, moduleName, entity, propertyName, args);

      const cached = await cacheService.get(key);
      if (cached !== null) {
        console.debug(`Cache HIT: ${key}`);
        return cached;
      }

      const result = await originalMethod.apply(this, args);
      if (result !== null && result !== undefined) {
        await cacheService.set(key, result, cacheTtl);
      }
      return result;
    };

    return descriptor;
  };
}
