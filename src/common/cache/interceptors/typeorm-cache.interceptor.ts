import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from '../cache.service';
import {
    CACHE_KEY,
    CACHE_TTL,
    NO_CACHE,
    CACHE_INVALIDATE,
    ENABLE_CACHE,
} from '../decorators/cache.decorator';
import {
    extractModuleName,
    extractEntityName,
    buildCacheKey,
} from '../utils/cache-key-builder';

@Injectable()
export class TypeOrmCacheInterceptor implements NestInterceptor {
    private readonly writeMethods = ['create', 'update', 'save', 'delete', 'remove', 'upsert'];

    constructor(
        private readonly cacheService: CacheService,
        private readonly reflector: Reflector,
    ) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const handler = context.getHandler();
        const className = context.getClass().name;
        const methodName = handler.name;

        // Check whether cache is disabled
        const noCache = this.reflector.getAllAndOverride<boolean>(NO_CACHE, [
            handler,
            context.getClass(),
        ]);

        if (noCache) {
            return next.handle();
        }

        // Read cache metadata
        const cacheKey = this.reflector.getAllAndOverride<string>(CACHE_KEY, [
            handler,
            context.getClass(),
        ]);
        const cacheTtl = this.reflector.getAllAndOverride<number>(CACHE_TTL, [
            handler,
            context.getClass(),
        ]);
        const invalidatePatterns = this.reflector.getAllAndOverride<string[]>(
            CACHE_INVALIDATE,
            [handler, context.getClass()],
        );
        const enableCache = this.reflector.getAllAndOverride<boolean>(ENABLE_CACHE, [
            handler,
            context.getClass(),
        ]);

        // If invalidation patterns exist, run then invalidate
        if (invalidatePatterns && invalidatePatterns.length > 0) {
            return next.handle().pipe(
                tap(async () => {
                    for (const pattern of invalidatePatterns) {
                        await this.cacheService.delPattern(pattern);
                    }
                }),
            );
        }

        // Detect write methods and invalidate cache automatically
        const isWriteMethod = this.writeMethods.some(method => 
            methodName.toLowerCase().includes(method.toLowerCase())
        );

        if (isWriteMethod) {
            return next.handle().pipe(
                tap(async (data) => {
                    await this.invalidateRelatedCache(className, methodName, context.getArgs());
                }),
            );
        }

        // If cache is not enabled, just run the handler
        if (!enableCache) {
            return next.handle();
        }

        // Extract info needed to build the key
        const filePath = this.getFilePath(context);
        const moduleName = extractModuleName(filePath);
        const entityName = extractEntityName(className);
        const args = context.getArgs();

        // Build cache key
        const key = cacheKey
            ? this.cacheService.generateKey(`typeorm:${moduleName}`, cacheKey, ...args)
            : buildCacheKey('typeorm', moduleName, entityName, methodName, args);

        // Try cache lookup
        return new Observable((observer) => {
            this.cacheService.get(key).then((cached) => {
                if (cached) {
                    observer.next(cached);
                    observer.complete();
                } else {
                    // On miss, execute and store
                    next.handle().subscribe({
                        next: async (data) => {
                            await this.cacheService.set(key, data, cacheTtl);
                            observer.next(data);
                            observer.complete();
                        },
                        error: (err) => observer.error(err),
                    });
                }
            });
        });
    }

    /**
     * Invalidates related cache after write operations
     */
    private async invalidateRelatedCache(
        className: string,
        methodName: string,
        args: any[],
    ): Promise<void> {
        // Try to extract an ID from the arguments
        let id: string | undefined;
        if (args.length > 0) {
            const firstArg = args[0];
            if (typeof firstArg === 'string') {
                id = firstArg;
            } else if (typeof firstArg === 'object' && firstArg !== null && 'id' in firstArg) {
                id = firstArg.id;
            }
        }

        // Extract context info (needs filePath)
        // For now, infer from the class name
        const entityName = extractEntityName(className);
        
        // Invalidation patterns based on entity name
        // Without direct filePath access here, use broader patterns
        const patterns = [
            `typeorm:*:${entityName}:*`,
        ];

        if (id) {
            patterns.push(`typeorm:*:${entityName}:findById:${id}*`);
        }

        for (const pattern of patterns) {
            await this.cacheService.delPattern(pattern);
        }
    }

    /**
     * Resolves a file path from the execution context
     */
    private getFilePath(context: ExecutionContext): string {
        // Try to resolve from the stack trace
        const stack = new Error().stack;
        if (stack) {
            const lines = stack.split('\n');
            for (const line of lines) {
                if (line.includes('modules/') && line.includes('.repository.ts')) {
                    const match = line.match(/([^\/]+\.repository\.ts)/);
                    if (match) {
                        // Try to build the full path
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
}

