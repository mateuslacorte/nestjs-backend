import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
    private readonly logger = new Logger(CacheService.name);
    private readonly redis: Redis;
    private readonly defaultTtl: number;

    constructor(
        @Inject('REDIS_CLIENT') private readonly redisClient: Redis,
        private readonly configService: ConfigService,
    ) {
        this.redis = redisClient;
        this.defaultTtl = this.configService.get<number>('redis.ttl', 3600);
    }

    /**
     * Obtém um valor do cache
     */
    async get<T>(key: string): Promise<T | null> {
        try {
            const cached = await this.redis.get(key);
            if (cached) {
                return JSON.parse(cached) as T;
            }
            return null;
        } catch (error) {
            this.logger.error(`Erro ao buscar cache para chave ${key}:`, error);
            return null;
        }
    }

    /**
     * Define um valor no cache
     */
    async set(key: string, value: any, ttl?: number): Promise<void> {
        try {
            const ttlToUse = ttl || this.defaultTtl;
            const serialized = JSON.stringify(value);
            await this.redis.setex(key, ttlToUse, serialized);
            this.logger.debug(`Cache SET: ${key} (TTL: ${ttlToUse}s, Size: ${serialized.length} bytes)`);
        } catch (error) {
            this.logger.error(`Erro ao definir cache para chave ${key}:`, error);
        }
    }

    /**
     * Remove uma chave do cache
     */
    async del(key: string): Promise<void> {
        try {
            await this.redis.del(key);
        } catch (error) {
            this.logger.error(`Erro ao deletar cache para chave ${key}:`, error);
        }
    }

    /**
     * Remove todas as chaves que correspondem a um padrão
     * Usa SCAN para ser mais seguro em produção (não bloqueia o Redis)
     */
    async delPattern(pattern: string): Promise<void> {
        try {
            this.logger.debug(`[Cache] Buscando chaves com padrão: ${pattern}`);
            
            // Converte padrão glob para regex
            const regexPattern = pattern
                .replace(/\*/g, '.*')
                .replace(/\?/g, '.');
            const regex = new RegExp(`^${regexPattern}$`);
            
            const keys: string[] = [];
            let cursor = '0';
            
            // Usa SCAN para iterar sobre as chaves (mais seguro que KEYS)
            do {
                const result = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
                cursor = result[0];
                const foundKeys = result[1];
                
                // Filtra as chaves que realmente correspondem ao padrão
                for (const key of foundKeys) {
                    if (regex.test(key)) {
                        keys.push(key);
                    }
                }
            } while (cursor !== '0');
            
            this.logger.debug(`[Cache] Encontradas ${keys.length} chaves com padrão ${pattern}`);
            
            if (keys.length > 0) {
                // Se houver muitas chaves, deleta em lotes para evitar problemas
                const batchSize = 100;
                for (let i = 0; i < keys.length; i += batchSize) {
                    const batch = keys.slice(i, i + batchSize);
                    await this.redis.del(...batch);
                }
                this.logger.log(`[Cache] ✅ Invalidados ${keys.length} caches com padrão ${pattern}`);
                if (keys.length <= 10) {
                    this.logger.debug(`[Cache] Chaves invalidadas: ${keys.join(', ')}`);
                }
            } else {
                this.logger.debug(`[Cache] Nenhuma chave encontrada com padrão ${pattern}`);
            }
        } catch (error) {
            this.logger.error(`[Cache] ❌ Erro ao deletar cache com padrão ${pattern}:`, error);
            // Tenta usar KEYS como fallback se SCAN falhar
            try {
                this.logger.warn(`[Cache] Tentando usar KEYS como fallback para padrão ${pattern}`);
                const keys = await this.redis.keys(pattern);
                if (keys.length > 0) {
                    const batchSize = 100;
                    for (let i = 0; i < keys.length; i += batchSize) {
                        const batch = keys.slice(i, i + batchSize);
                        await this.redis.del(...batch);
                    }
                    this.logger.log(`[Cache] ✅ Invalidados ${keys.length} caches (fallback) com padrão ${pattern}`);
                }
            } catch (fallbackError) {
                this.logger.error(`[Cache] ❌ Erro no fallback também:`, fallbackError);
                throw error; // Re-throw o erro original
            }
        }
    }

    /**
     * Gera uma chave de cache baseada em parâmetros
     */
    generateKey(prefix: string, ...params: any[]): string {
        const paramsStr = params
            .map(p => {
                if (typeof p === 'object' && p !== null) {
                    return JSON.stringify(p);
                }
                return String(p);
            })
            .join(':');
        return `${prefix}:${paramsStr}`;
    }
}

