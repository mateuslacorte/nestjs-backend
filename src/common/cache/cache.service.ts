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
     */
    async delPattern(pattern: string): Promise<void> {
        try {
            const keys = await this.redis.keys(pattern);
            if (keys.length > 0) {
                await this.redis.del(...keys);
                this.logger.debug(`Invalidados ${keys.length} caches com padrão ${pattern}`);
            }
        } catch (error) {
            this.logger.error(`Erro ao deletar cache com padrão ${pattern}:`, error);
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

