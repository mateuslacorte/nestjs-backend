import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
    AuditPage,
    IAuditEvent,
    RecordAuditEventInput,
    SearchAuditEventsQuery,
} from './interfaces/audit.interface';
import { AuditPostgresRepository } from './repositories/postgres.repository';
import { decodeAuditCursor, encodeAuditCursor } from './utils/cursor.util';

const IDENTIFIER_MAX_LENGTH = 320;
const FAILURE_REASON_MAX_LENGTH = 512;
const DESCRIPTION_MAX_LENGTH = 512;
const ACTION_MAX_LENGTH = 128;
const CATEGORY_MAX_LENGTH = 64;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

@Injectable()
export class AuditService {
    constructor(private readonly postgresRepo: AuditPostgresRepository) {}

    /**
     * Persist an audit event. Never throws to callers.
     */
    async record(
        input: RecordAuditEventInput,
    ): Promise<IAuditEvent | null> {
        try {
            return await this.postgresRepo.create({
                id: randomUUID(),
                action: this.truncate(input.action, ACTION_MAX_LENGTH) ?? 'unknown',
                category: this.truncate(input.category, CATEGORY_MAX_LENGTH),
                description: this.truncate(
                    input.description,
                    DESCRIPTION_MAX_LENGTH,
                ),
                ip: input.ip,
                port: input.port,
                success: input.success,
                provider: input.provider,
                identifier: this.truncate(
                    input.identifier,
                    IDENTIFIER_MAX_LENGTH,
                ),
                userId: input.userId,
                failureReason: this.truncate(
                    input.failureReason,
                    FAILURE_REASON_MAX_LENGTH,
                ),
                userAgent: input.userAgent,
                metadata: input.metadata,
                timestamp: input.timestamp ?? new Date(),
            });
        } catch (error) {
            const message =
                error instanceof Error ? error.message : String(error);
            console.error(`Failed to record audit event: ${message}`);
            return null;
        }
    }

    async search(query: SearchAuditEventsQuery = {}): Promise<AuditPage> {
        const limit = Math.min(
            Math.max(query.limit ?? DEFAULT_PAGE_SIZE, 1),
            MAX_PAGE_SIZE,
        );

        let cursorTimestamp: Date | undefined;
        let cursorId: string | undefined;
        if (query.cursor) {
            const decoded = decodeAuditCursor(query.cursor);
            cursorTimestamp = decoded.timestamp;
            cursorId = decoded.id;
        }

        const rows = await this.postgresRepo.search({
            limit: limit + 1,
            cursorTimestamp,
            cursorId,
            q: query.q,
            ip: query.ip,
            success: query.success,
            action: query.action,
            category: query.category,
            userId: query.userId,
            provider: query.provider,
        });

        const hasMore = rows.length > limit;
        const items = hasMore ? rows.slice(0, limit) : rows;
        const last = items[items.length - 1];
        const nextCursor =
            hasMore && last
                ? encodeAuditCursor(last.timestamp, last.id)
                : null;

        return { items, nextCursor };
    }

    private truncate(
        value: string | undefined,
        max: number,
    ): string | undefined {
        if (value == null) {
            return undefined;
        }
        return value.length > max ? value.slice(0, max) : value;
    }
}
