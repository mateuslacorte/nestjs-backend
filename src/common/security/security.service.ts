import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { IBlockedIp } from './interfaces/blocked-ip.interface';
import { BlockedIpPostgresRepository } from './repositories/postgres.repository';

const MAX_ATTEMPTS = 1;
const MAX_PATHS_STORED = 20;

@Injectable()
export class SecurityService {
    constructor(
        private readonly postgresRepo: BlockedIpPostgresRepository,
    ) {}

    /**
     * Registers an invalid-route attempt for an IP.
     * Blocks the IP when attempts reach MAX_ATTEMPTS.
     */
    async registerInvalidRouteAttempt(
        ip: string,
        path: string,
        userAgent?: string,
    ): Promise<{ blocked: boolean; attempts: number }> {
        const existing = await this.postgresRepo.findByIp(ip);

        if (existing) {
            existing.attempts += 1;
            existing.lastAttemptAt = new Date();
            existing.userAgent = userAgent;
            existing.paths = [...existing.paths, path].slice(-MAX_PATHS_STORED);

            if (existing.attempts >= MAX_ATTEMPTS && !existing.blocked) {
                existing.blocked = true;
                existing.blockedAt = new Date();
                console.warn(
                    `[SECURITY] IP ${ip} bloqueado após ${existing.attempts} tentativas`,
                );
            }

            await this.postgresRepo.save(existing);
            return { blocked: existing.blocked, attempts: existing.attempts };
        }

        const newRecord: Partial<IBlockedIp> = {
            id: uuidv4(),
            ip,
            attempts: 1,
            blocked: false,
            lastAttemptAt: new Date(),
            paths: [path],
            userAgent,
        };

        await this.postgresRepo.create(newRecord);
        return { blocked: false, attempts: 1 };
    }

    /**
     * Verifica se um IP está bloqueado
     */
    async isIpBlocked(ip: string): Promise<boolean> {
        const record = await this.postgresRepo.findBlockedByIp(ip);
        return !!record;
    }

    /**
     * Lista todos os IPs bloqueados
     */
    async getBlockedIps(): Promise<IBlockedIp[]> {
        return this.postgresRepo.findBlocked();
    }

    /**
     * Lista todos os IPs suspeitos (com tentativas mas não bloqueados)
     */
    async getSuspiciousIps(): Promise<IBlockedIp[]> {
        return this.postgresRepo.findSuspicious();
    }

    /**
     * Desbloqueia um IP
     */
    async unblockIp(ip: string): Promise<IBlockedIp> {
        const record = await this.postgresRepo.findByIp(ip);
        if (!record) {
            throw new NotFoundException(`IP ${ip} not found`);
        }

        record.blocked = false;
        record.attempts = 0;
        record.paths = [];

        return this.postgresRepo.save(record);
    }

    /**
     * Remove um IP da lista
     */
    async removeIp(ip: string): Promise<void> {
        const record = await this.postgresRepo.findByIp(ip);
        if (!record) {
            throw new NotFoundException(`IP ${ip} not found`);
        }

        await this.postgresRepo.deleteById(record.id);
    }

    /**
     * Reseta as tentativas de um IP (sem remover)
     */
    async resetAttempts(ip: string): Promise<IBlockedIp> {
        const record = await this.postgresRepo.findByIp(ip);
        if (!record) {
            throw new NotFoundException(`IP ${ip} not found`);
        }

        record.attempts = 0;
        record.blocked = false;
        record.blockedAt = undefined;
        record.paths = [];

        return this.postgresRepo.save(record);
    }
}
