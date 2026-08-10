import { BadRequestException } from '@nestjs/common';
import { decodeAuditCursor, encodeAuditCursor } from './cursor.util';

describe('cursor.util', () => {
  it('round-trips timestamp and id', () => {
    const timestamp = new Date('2026-08-10T12:00:00.000Z');
    const cursor = encodeAuditCursor(timestamp, 'id-1');
    expect(decodeAuditCursor(cursor)).toEqual({
      timestamp,
      id: 'id-1',
    });
  });

  it('rejects malformed cursors', () => {
    expect(() => decodeAuditCursor('not-valid')).toThrow(BadRequestException);
    expect(() =>
      decodeAuditCursor(
        Buffer.from(JSON.stringify({ c: 'nope', i: 'x' }), 'utf8').toString(
          'base64url',
        ),
      ),
    ).toThrow(BadRequestException);
    expect(() =>
      decodeAuditCursor(
        Buffer.from(JSON.stringify({ c: '', i: 'x' }), 'utf8').toString(
          'base64url',
        ),
      ),
    ).toThrow(BadRequestException);
  });
});
