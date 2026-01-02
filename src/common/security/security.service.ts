import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Repository } from 'typeorm';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { BlockedIpEntity } from './entities/blocked-ip.entity';
import { BlockedIp } from './schemas/blocked-ip.schema';
import { IBlockedIp } from './interfaces/blocked-ip.interface';

const MAX_ATTEMPTS = 1;
const MAX_PATHS_STORED = 20;

@Injectable()
export class SecurityService {
    constructor(
        @InjectRepository(BlockedIpEntity)
        private readonly blockedIpRepository: Repository<BlockedIpEntity>,
        @InjectModel(BlockedIp.name)
        private readonly blockedIpModel: Model<BlockedIp>,
    ) {}

    /**
     * Registra uma tentativa de acesso a rota inexistente
     * Se atingir 10 tentativas, bloqueia o IP
     */
    async registerInvalidRouteAttempt(
        ip: string,
        path: string,
        userAgent?: string,
    ): Promise<{ blocked: boolean; attempts: number }> {
        const existing = await this.blockedIpRepository.findOne({ where: { ip } });

        if (existing) {
            // Atualizar registro existente
            existing.attempts += 1;
            existing.lastAttemptAt = new Date();
            existing.userAgent = userAgent;

            // Adicionar path ao array (mantendo apenas os últimos N)
            existing.paths = [...existing.paths, path].slice(-MAX_PATHS_STORED);

            // Bloquear se atingiu o limite
            if (existing.attempts >= MAX_ATTEMPTS && !existing.blocked) {
                existing.blocked = true;
                existing.blockedAt = new Date();
                console.warn(`[SECURITY] IP ${ip} bloqueado após ${existing.attempts} tentativas`);
            }

            await this.blockedIpRepository.save(existing);
            await this.blockedIpModel.findOneAndUpdate(
                { id: existing.id },
                {
                    $set: {
                        attempts: existing.attempts,
                        lastAttemptAt: existing.lastAttemptAt,
                        userAgent: existing.userAgent,
                        blocked: existing.blocked,
                        blockedAt: existing.blockedAt,
                    },
                    $push: {
                        paths: {
                            $each: [path],
                            $slice: -MAX_PATHS_STORED,
                        },
                    },
                },
            );

            return { blocked: existing.blocked, attempts: existing.attempts };
        }

        // Criar novo registro
        const id = uuidv4();
        const newRecord: Partial<IBlockedIp> = {
            id,
            ip,
            attempts: 1,
            blocked: false,
            lastAttemptAt: new Date(),
            paths: [path],
            userAgent,
        };

        const entity = this.blockedIpRepository.create(newRecord);
        await this.blockedIpRepository.save(entity);

        const mongoDoc = new this.blockedIpModel(newRecord);
        await mongoDoc.save();

        return { blocked: false, attempts: 1 };
    }

    /**
     * Verifica se um IP está bloqueado
     */
    async isIpBlocked(ip: string): Promise<boolean> {
        const record = await this.blockedIpRepository.findOne({
            where: { ip, blocked: true },
        });
        return !!record;
    }

    /**
     * Lista todos os IPs bloqueados
     */
    async getBlockedIps(): Promise<IBlockedIp[]> {
        return this.blockedIpRepository.find({
            where: { blocked: true },
            order: { blockedAt: 'DESC' },
        });
    }

    /**
     * Lista todos os IPs suspeitos (com tentativas mas não bloqueados)
     */
    async getSuspiciousIps(): Promise<IBlockedIp[]> {
        return this.blockedIpRepository.find({
            where: { blocked: false },
            order: { attempts: 'DESC' },
        });
    }

    /**
     * Desbloqueia um IP
     */
    async unblockIp(ip: string): Promise<IBlockedIp | null> {
        const record = await this.blockedIpRepository.findOne({ where: { ip } });
        if (!record) return null;

        record.blocked = false;
        record.attempts = 0;
        record.paths = [];

        await this.blockedIpRepository.save(record);
        await this.blockedIpModel.findOneAndUpdate(
            { id: record.id },
            { $set: { blocked: false, attempts: 0, paths: [] } },
        );

        return record;
    }

    /**
     * Remove um IP da lista
     */
    async removeIp(ip: string): Promise<boolean> {
        const record = await this.blockedIpRepository.findOne({ where: { ip } });
        if (!record) return false;

        await this.blockedIpRepository.delete(record.id);
        await this.blockedIpModel.deleteOne({ id: record.id });

        return true;
    }

    /**
     * Reseta as tentativas de um IP (sem remover)
     */
    async resetAttempts(ip: string): Promise<IBlockedIp | null> {
        const record = await this.blockedIpRepository.findOne({ where: { ip } });
        if (!record) return null;

        record.attempts = 0;
        record.blocked = false;
        record.blockedAt = undefined;
        record.paths = [];

        await this.blockedIpRepository.save(record);
        await this.blockedIpModel.findOneAndUpdate(
            { id: record.id },
            { $set: { attempts: 0, blocked: false, blockedAt: null, paths: [] } },
        );

        return record;
    }
}
