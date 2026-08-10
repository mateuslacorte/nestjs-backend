import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { AuditEntity } from '../entities/audit.entity';
import {
    AuditSearchRepoFilter,
    IAuditEvent,
} from '../interfaces/audit.interface';

@Injectable()
export class AuditPostgresRepository {
    constructor(
        @InjectRepository(AuditEntity)
        private readonly auditRepository: Repository<AuditEntity>,
    ) {}

    async create(data: Partial<IAuditEvent>): Promise<IAuditEvent> {
        const entity = this.auditRepository.create(data);
        return this.auditRepository.save(entity);
    }

    async search(filter: AuditSearchRepoFilter): Promise<IAuditEvent[]> {
        const qb = this.auditRepository.createQueryBuilder('a');

        if (filter.ip) {
            qb.andWhere('a.ip = :ip', { ip: filter.ip });
        }
        if (typeof filter.success === 'boolean') {
            qb.andWhere('a.success = :success', { success: filter.success });
        }
        if (filter.action) {
            qb.andWhere('a.action = :action', { action: filter.action });
        }
        if (filter.category) {
            qb.andWhere('a.category = :category', { category: filter.category });
        }
        if (filter.userId) {
            qb.andWhere('a.userId = :userId', { userId: filter.userId });
        }
        if (filter.provider) {
            qb.andWhere('a.provider = :provider', { provider: filter.provider });
        }

        if (filter.q?.trim()) {
            const q = `%${filter.q.trim()}%`;
            qb.andWhere(
                new Brackets((sub) => {
                    sub.where('a.identifier ILIKE :q', { q })
                        .orWhere('a.action ILIKE :q', { q })
                        .orWhere('a.description ILIKE :q', { q })
                        .orWhere('a.ip ILIKE :q', { q })
                        .orWhere('a.userId::text ILIKE :q', { q })
                        .orWhere('a.failureReason ILIKE :q', { q });
                }),
            );
        }

        if (filter.cursorTimestamp && filter.cursorId) {
            qb.andWhere(
                new Brackets((sub) => {
                    sub.where('a.timestamp < :cursorTimestamp', {
                        cursorTimestamp: filter.cursorTimestamp,
                    }).orWhere(
                        '(a.timestamp = :cursorTimestamp AND a.id < :cursorId)',
                        {
                            cursorTimestamp: filter.cursorTimestamp,
                            cursorId: filter.cursorId,
                        },
                    );
                }),
            );
        }

        return qb
            .orderBy('a.timestamp', 'DESC')
            .addOrderBy('a.id', 'DESC')
            .take(filter.limit)
            .getMany();
    }
}
