import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
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
export class MongooseCacheInterceptor implements NestInterceptor {
    private readonly writeMethods = ['create', 'update', 'save', 'delete', 'remove'];

    constructor(
        private readonly cacheService: CacheService,
        private readonly reflector: Reflector,
    ) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const handler = context.getHandler();
        const className = context.getClass().name;
        const methodName = handler.name;

        // Verifica se o cache está desabilitado
        const noCache = this.reflector.getAllAndOverride<boolean>(NO_CACHE, [
            handler,
            context.getClass(),
        ]);

        if (noCache) {
            return next.handle();
        }

        // Obtém metadados de cache
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

        // Se há padrões de invalidação, executa e invalida
        if (invalidatePatterns && invalidatePatterns.length > 0) {
            return next.handle().pipe(
                tap(async () => {
                    for (const pattern of invalidatePatterns) {
                        await this.cacheService.delPattern(pattern);
                    }
                }),
            );
        }

        // Detecta se é método de escrita e invalida cache automaticamente
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

        // Se cache não está habilitado, apenas executa
        if (!enableCache) {
            return next.handle();
        }

        // Extrai informações para gerar chave
        const filePath = this.getFilePath(context);
        const moduleName = extractModuleName(filePath);
        const entityName = extractEntityName(className);
        const args = context.getArgs();

        // Gera chave de cache
        const key = cacheKey
            ? this.cacheService.generateKey(`mongoose:${moduleName}`, cacheKey, ...args)
            : buildCacheKey('mongoose', moduleName, entityName, methodName, args);

        // Tenta obter do cache
        return new Observable((observer) => {
            this.cacheService.get(key).then((cached) => {
                if (cached) {
                    observer.next(cached);
                    observer.complete();
                } else {
                    // Se não está em cache, executa e armazena
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
     * Invalida cache relacionado após operações de escrita
     */
    private async invalidateRelatedCache(
        className: string,
        methodName: string,
        args: any[],
    ): Promise<void> {
        // Tenta extrair ID dos argumentos
        let id: string | undefined;
        if (args.length > 0) {
            const firstArg = args[0];
            if (typeof firstArg === 'string') {
                id = firstArg;
            } else if (typeof firstArg === 'object' && firstArg !== null && 'id' in firstArg) {
                id = firstArg.id;
            }
        }

        // Extrai informações do contexto
        const entityName = extractEntityName(className);
        
        // Padrões de invalidação baseados no nome da entidade
        const patterns = [
            `mongoose:*:${entityName}:*`,
        ];

        if (id) {
            patterns.push(`mongoose:*:${entityName}:findById:${id}*`);
        }

        for (const pattern of patterns) {
            await this.cacheService.delPattern(pattern);
        }
    }

    /**
     * Obtém o caminho do arquivo do contexto
     */
    private getFilePath(context: ExecutionContext): string {
        // Tenta obter do stack trace
        const stack = new Error().stack;
        if (stack) {
            const lines = stack.split('\n');
            for (const line of lines) {
                if (line.includes('modules/') && line.includes('.repository.ts')) {
                    const match = line.match(/([^\/]+\.repository\.ts)/);
                    if (match) {
                        // Tenta encontrar o caminho completo
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

