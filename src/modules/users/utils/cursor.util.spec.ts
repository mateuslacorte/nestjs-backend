import { BadRequestException } from '@nestjs/common';
import { decodeUserCursor, encodeUserCursor } from './cursor.util';

describe('user cursor util', () => {
  it('round-trips createdAt and id', () => {
    const createdAt = new Date('2026-08-10T12:00:00.000Z');
    const cursor = encodeUserCursor(createdAt, 'id-1');
    expect(decodeUserCursor(cursor)).toEqual({ createdAt, id: 'id-1' });
  });

  it('rejects invalid shape and invalid dates', () => {
    const badShape = Buffer.from(JSON.stringify({ c: '', i: 'x' }), 'utf8').toString(
      'base64url',
    );
    const badDate = Buffer.from(
      JSON.stringify({ c: 'not-a-date', i: 'x' }),
      'utf8',
    ).toString('base64url');
    const missingI = Buffer.from(JSON.stringify({ c: '2026-01-01T00:00:00.000Z' }), 'utf8').toString(
      'base64url',
    );

    expect(() => decodeUserCursor(badShape)).toThrow(BadRequestException);
    expect(() => decodeUserCursor(badDate)).toThrow(BadRequestException);
    expect(() => decodeUserCursor(missingI)).toThrow(BadRequestException);
  });
});
