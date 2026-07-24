import * as crypto from 'crypto';
import {
  buildCacheKey,
  extractEntityName,
  extractModuleName,
  hashParams,
  normalizeModuleName,
  normalizeParams,
} from './cache-key-builder';

describe('cache-key-builder', () => {
  describe('extractModuleName', () => {
    it('extracts and normalizes module from a modules/ path', () => {
      expect(
        extractModuleName(
          'src/modules/users/repositories/postgres.repository.ts',
        ),
      ).toBe('users');
    });

    it('normalizes hyphenated module names to underscores', () => {
      expect(
        extractModuleName('src/modules/facility-reservations/foo.ts'),
      ).toBe('facility_reservations');
    });

    it('returns unknown when modules/ segment is missing', () => {
      expect(extractModuleName('src/common/cache/cache.service.ts')).toBe(
        'unknown',
      );
    });
  });

  describe('normalizeModuleName', () => {
    it('lowercases and replaces hyphens with underscores', () => {
      expect(normalizeModuleName('Facility-Reservations')).toBe(
        'facility_reservations',
      );
    });
  });

  describe('extractEntityName', () => {
    it.each([
      ['UserPostgresRepository', 'user'],
      ['UserMongoRepository', 'user'],
      ['UserRepository', 'user'],
      ['CondominiumInvoiceMongoRepository', 'condominium_invoice'],
      ['FacilityReservationPostgresRepository', 'facility_reservation'],
    ])('maps %s → %s', (className, expected) => {
      expect(extractEntityName(className)).toBe(expected);
    });
  });

  describe('normalizeParams', () => {
    it('maps null and undefined to null', () => {
      expect(normalizeParams(null, undefined)).toBe('null:null');
    });

    it('stringifies primitives', () => {
      expect(normalizeParams('a', 1, true)).toBe('a:1:true');
    });

    it('sorts object keys for stable serialization', () => {
      expect(normalizeParams({ b: 1, a: 2 })).toBe(
        normalizeParams({ a: 2, b: 1 }),
      );
      expect(normalizeParams({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
    });

    it('stringifies symbols, bigints, and functions via String()', () => {
      const sym = Symbol('x');
      expect(normalizeParams(sym)).toBe(String(sym));
      expect(normalizeParams(10n)).toBe('10');
      const fn = () => undefined;
      expect(normalizeParams(fn)).toBe(String(fn));
    });
  });

  describe('hashParams', () => {
    it('returns a stable 16-char md5 hex prefix', () => {
      const input = 'x'.repeat(120);
      const expected = crypto
        .createHash('md5')
        .update(input)
        .digest('hex')
        .substring(0, 16);

      expect(hashParams(input)).toBe(expected);
      expect(hashParams(input)).toHaveLength(16);
    });
  });

  describe('buildCacheKey', () => {
    it('builds a namespaced key with raw params when short', () => {
      expect(
        buildCacheKey('typeorm', 'users', 'user', 'findById', ['abc']),
      ).toBe('typeorm:users:user:findById:abc');
    });

    it('defaults params to an empty array when omitted', () => {
      expect(buildCacheKey('typeorm', 'users', 'user', 'findAll')).toBe(
        'typeorm:users:user:findAll:',
      );
    });

    it('hashes params when normalized string exceeds 100 chars', () => {
      const long = 'y'.repeat(101);
      const key = buildCacheKey('mongoose', 'users', 'user', 'findAll', [
        long,
      ]);
      const hash = hashParams(long);

      expect(key).toBe(`mongoose:users:user:findAll:${hash}`);
      expect(key.split(':').pop()).toHaveLength(16);
    });
  });
});
