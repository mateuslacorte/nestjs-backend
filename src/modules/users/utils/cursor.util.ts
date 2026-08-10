import { BadRequestException } from '@nestjs/common';
import { UserCursorPayload } from '../interfaces/user.interface';

export function encodeUserCursor(createdAt: Date, id: string): string {
    const payload: UserCursorPayload = {
        c: createdAt.toISOString(),
        i: id,
    };
    return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeUserCursor(cursor: string): {
    createdAt: Date;
    id: string;
} {
    try {
        const json = Buffer.from(cursor, 'base64url').toString('utf8');
        const parsed = JSON.parse(json) as UserCursorPayload;
        if (
            typeof parsed?.c !== 'string' ||
            typeof parsed?.i !== 'string' ||
            !parsed.c ||
            !parsed.i
        ) {
            throw new Error('invalid shape');
        }
        const createdAt = new Date(parsed.c);
        if (Number.isNaN(createdAt.getTime())) {
            throw new Error('invalid date');
        }
        return { createdAt, id: parsed.i };
    } catch {
        throw new BadRequestException('Invalid user cursor');
    }
}
