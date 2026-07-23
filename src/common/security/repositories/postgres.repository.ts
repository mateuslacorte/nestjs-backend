import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlockedIpEntity } from '../entities/blocked-ip.entity';
import { IBlockedIp } from '../interfaces/blocked-ip.interface';

@Injectable()
export class BlockedIpPostgresRepository {
    constructor(
        @InjectRepository(BlockedIpEntity)
        private readonly blockedIpRepository: Repository<BlockedIpEntity>,
    ) {}

    async findByIp(ip: string): Promise<IBlockedIp | null> {
        return this.blockedIpRepository.findOne({ where: { ip } });
    }

    async findBlockedByIp(ip: string): Promise<IBlockedIp | null> {
        return this.blockedIpRepository.findOne({
            where: { ip, blocked: true },
        });
    }

    async findBlocked(): Promise<IBlockedIp[]> {
        return this.blockedIpRepository.find({
            where: { blocked: true },
            order: { blockedAt: 'DESC' },
        });
    }

    async findSuspicious(): Promise<IBlockedIp[]> {
        return this.blockedIpRepository.find({
            where: { blocked: false },
            order: { attempts: 'DESC' },
        });
    }

    async create(data: Partial<IBlockedIp>): Promise<IBlockedIp> {
        const entity = this.blockedIpRepository.create(data);
        return this.blockedIpRepository.save(entity);
    }

    async save(entity: IBlockedIp): Promise<IBlockedIp> {
        return this.blockedIpRepository.save(entity as BlockedIpEntity);
    }

    async deleteById(id: string): Promise<void> {
        await this.blockedIpRepository.delete(id);
    }
}
