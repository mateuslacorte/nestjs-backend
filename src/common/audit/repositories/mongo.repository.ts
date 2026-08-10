import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Audit } from '../schemas/audit.schema';
import {
    AuditSearchRepoFilter,
    IAuditEvent,
} from '../interfaces/audit.interface';

/**
 * CQRS-ready Mongo store for audit events.
 * Not used by AuditService today (Postgres is the active store).
 */
@Injectable()
export class AuditMongoRepository {
    constructor(
        @InjectModel(Audit.name)
        private readonly auditModel: Model<Audit>,
    ) {}

    async create(data: Partial<IAuditEvent>): Promise<IAuditEvent> {
        const doc = new this.auditModel(data);
        await doc.save();
        return doc.toObject() as unknown as IAuditEvent;
    }

    async search(filter: AuditSearchRepoFilter): Promise<IAuditEvent[]> {
        const query: Record<string, unknown> = {};

        if (filter.ip) {
            query.ip = filter.ip;
        }
        if (typeof filter.success === 'boolean') {
            query.success = filter.success;
        }
        if (filter.action) {
            query.action = filter.action;
        }
        if (filter.category) {
            query.category = filter.category;
        }
        if (filter.userId) {
            query.userId = filter.userId;
        }
        if (filter.provider) {
            query.provider = filter.provider;
        }

        const and: Record<string, unknown>[] = [];

        if (filter.q?.trim()) {
            const pattern = filter.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = { $regex: pattern, $options: 'i' };
            and.push({
                $or: [
                    { identifier: regex },
                    { action: regex },
                    { description: regex },
                    { ip: regex },
                    { userId: regex },
                    { failureReason: regex },
                ],
            });
        }

        if (filter.cursorTimestamp && filter.cursorId) {
            and.push({
                $or: [
                    { timestamp: { $lt: filter.cursorTimestamp } },
                    {
                        timestamp: filter.cursorTimestamp,
                        id: { $lt: filter.cursorId },
                    },
                ],
            });
        }

        if (and.length > 0) {
            query.$and = and;
        }

        return this.auditModel
            .find(query)
            .sort({ timestamp: -1, id: -1 })
            .limit(filter.limit)
            .lean() as unknown as Promise<IAuditEvent[]>;
    }
}
