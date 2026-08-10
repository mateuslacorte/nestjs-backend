import { BadRequestException } from '@nestjs/common';
import { AuditCursorPayload } from '../interfaces/audit.interface';

export function encodeAuditCursor(timestamp: Date, id: string): string {
    const payload: AuditCursorPayload = {
        c: timestamp.toISOString(),
        i: id,
    };
    return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeAuditCursor(cursor: string): {
    timestamp: Date;
    id: string;
} {
    try {
        const json = Buffer.from(cursor, 'base64url').toString('utf8');
        const parsed = JSON.parse(json) as AuditCursorPayload;
        if (
            typeof parsed?.c !== 'string' ||
            typeof parsed?.i !== 'string' ||
            !parsed.c ||
            !parsed.i
        ) {
            throw new Error('invalid shape');
        }
        const timestamp = new Date(parsed.c);
        if (Number.isNaN(timestamp.getTime())) {
            throw new Error('invalid date');
        }
        return { timestamp, id: parsed.i };
    } catch {
        throw new BadRequestException('Invalid audit cursor');
    }
}
