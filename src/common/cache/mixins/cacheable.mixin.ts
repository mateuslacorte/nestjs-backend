import { Injectable, Inject, Optional } from '@nestjs/common';
import { CacheService } from '../cache.service';

/**
 * Mixin that adds CacheService to repositories
 */
export function CacheableRepository<T extends { new (...args: any[]): {} }>(constructor: T) {
    @Injectable()
    class CacheableClass extends constructor {
        @Optional()
        @Inject(CacheService)
        public cacheService?: CacheService;
    }
    return CacheableClass;
}

