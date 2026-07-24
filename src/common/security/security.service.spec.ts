import { NotFoundException } from '@nestjs/common';
import { SecurityService } from './security.service';
import { BlockedIpPostgresRepository } from './repositories/postgres.repository';
import { IBlockedIp } from './interfaces/blocked-ip.interface';

jest.mock('uuid', () => ({
  v4: () => 'fixed-uuid',
}));

function createRecord(overrides: Partial<IBlockedIp> = {}): IBlockedIp {
  return {
    id: 'id-1',
    ip: '1.2.3.4',
    attempts: 1,
    blocked: false,
    lastAttemptAt: new Date('2024-01-01T00:00:00.000Z'),
    paths: ['/old'],
    userAgent: 'ua',
    ...overrides,
  };
}

describe('SecurityService', () => {
  let postgresRepo: jest.Mocked<
    Pick<
      BlockedIpPostgresRepository,
      | 'findByIp'
      | 'findBlockedByIp'
      | 'findBlocked'
      | 'findSuspicious'
      | 'create'
      | 'save'
      | 'deleteById'
    >
  >;
  let service: SecurityService;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    postgresRepo = {
      findByIp: jest.fn(),
      findBlockedByIp: jest.fn(),
      findBlocked: jest.fn(),
      findSuspicious: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      deleteById: jest.fn(),
    };
    service = new SecurityService(
      postgresRepo as unknown as BlockedIpPostgresRepository,
    );
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  describe('registerInvalidRouteAttempt', () => {
    it('creates a new record for an unknown IP as unblocked with attempts=1', async () => {
      postgresRepo.findByIp.mockResolvedValue(null);
      postgresRepo.create.mockImplementation(async (data) => data as IBlockedIp);

      const result = await service.registerInvalidRouteAttempt(
        '10.0.0.1',
        '/secret',
        'Mozilla/5.0',
      );

      expect(result).toEqual({ blocked: false, attempts: 1 });
      expect(postgresRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'fixed-uuid',
          ip: '10.0.0.1',
          attempts: 1,
          blocked: false,
          paths: ['/secret'],
          userAgent: 'Mozilla/5.0',
          lastAttemptAt: expect.any(Date),
        }),
      );
    });

    it('creates a new record without userAgent when omitted', async () => {
      postgresRepo.findByIp.mockResolvedValue(null);
      postgresRepo.create.mockResolvedValue(createRecord());

      await service.registerInvalidRouteAttempt('10.0.0.1', '/x');

      expect(postgresRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userAgent: undefined,
          paths: ['/x'],
        }),
      );
    });

    it('increments attempts and blocks when MAX_ATTEMPTS is reached on update', async () => {
      const existing = createRecord({ attempts: 1, blocked: false, paths: ['/a'] });
      postgresRepo.findByIp.mockResolvedValue(existing);
      postgresRepo.save.mockImplementation(async (entity) => entity);

      const result = await service.registerInvalidRouteAttempt(
        '1.2.3.4',
        '/b',
        'bot',
      );

      expect(result.blocked).toBe(true);
      expect(result.attempts).toBe(2);
      expect(existing.blocked).toBe(true);
      expect(existing.blockedAt).toEqual(expect.any(Date));
      expect(existing.userAgent).toBe('bot');
      expect(existing.paths).toEqual(['/a', '/b']);
      expect(postgresRepo.save).toHaveBeenCalledWith(existing);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY] IP 1.2.3.4 bloqueado'),
      );
    });

    it('blocks on first update when existing attempts start at 0', async () => {
      const existing = createRecord({ attempts: 0, blocked: false, paths: [] });
      postgresRepo.findByIp.mockResolvedValue(existing);
      postgresRepo.save.mockImplementation(async (entity) => entity);

      const result = await service.registerInvalidRouteAttempt('1.2.3.4', '/p');

      expect(result).toEqual({ blocked: true, attempts: 1 });
      expect(existing.blockedAt).toEqual(expect.any(Date));
    });

    it('does not re-set blockedAt when IP is already blocked', async () => {
      const blockedAt = new Date('2023-06-01T00:00:00.000Z');
      const existing = createRecord({
        attempts: 5,
        blocked: true,
        blockedAt,
        paths: ['/a'],
      });
      postgresRepo.findByIp.mockResolvedValue(existing);
      postgresRepo.save.mockImplementation(async (entity) => entity);

      const result = await service.registerInvalidRouteAttempt('1.2.3.4', '/z');

      expect(result.blocked).toBe(true);
      expect(result.attempts).toBe(6);
      expect(existing.blockedAt).toBe(blockedAt);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('keeps only the last 20 paths', async () => {
      const paths = Array.from({ length: 20 }, (_, i) => `/p${i}`);
      const existing = createRecord({
        attempts: 10,
        blocked: true,
        paths,
      });
      postgresRepo.findByIp.mockResolvedValue(existing);
      postgresRepo.save.mockImplementation(async (entity) => entity);

      await service.registerInvalidRouteAttempt('1.2.3.4', '/newest');

      expect(existing.paths).toHaveLength(20);
      expect(existing.paths[0]).toBe('/p1');
      expect(existing.paths[19]).toBe('/newest');
    });
  });

  describe('isIpBlocked', () => {
    it('returns true when a blocked record exists', async () => {
      postgresRepo.findBlockedByIp.mockResolvedValue(createRecord({ blocked: true }));
      await expect(service.isIpBlocked('1.2.3.4')).resolves.toBe(true);
    });

    it('returns false when no blocked record exists', async () => {
      postgresRepo.findBlockedByIp.mockResolvedValue(null);
      await expect(service.isIpBlocked('1.2.3.4')).resolves.toBe(false);
    });
  });

  describe('getBlockedIps / getSuspiciousIps', () => {
    it('delegates getBlockedIps to the repository', async () => {
      const rows = [createRecord({ blocked: true })];
      postgresRepo.findBlocked.mockResolvedValue(rows);
      await expect(service.getBlockedIps()).resolves.toBe(rows);
    });

    it('delegates getSuspiciousIps to the repository', async () => {
      const rows = [createRecord({ blocked: false })];
      postgresRepo.findSuspicious.mockResolvedValue(rows);
      await expect(service.getSuspiciousIps()).resolves.toBe(rows);
    });
  });

  describe('unblockIp', () => {
    it('clears block state and saves', async () => {
      const existing = createRecord({
        blocked: true,
        attempts: 4,
        paths: ['/a', '/b'],
      });
      postgresRepo.findByIp.mockResolvedValue(existing);
      postgresRepo.save.mockImplementation(async (entity) => entity);

      const result = await service.unblockIp('1.2.3.4');

      expect(result.blocked).toBe(false);
      expect(result.attempts).toBe(0);
      expect(result.paths).toEqual([]);
      expect(postgresRepo.save).toHaveBeenCalledWith(existing);
    });

    it('throws NotFoundException when IP is missing', async () => {
      postgresRepo.findByIp.mockResolvedValue(null);
      await expect(service.unblockIp('9.9.9.9')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(service.unblockIp('9.9.9.9')).rejects.toThrow(
        'IP 9.9.9.9 not found',
      );
    });
  });

  describe('removeIp', () => {
    it('deletes by record id', async () => {
      postgresRepo.findByIp.mockResolvedValue(createRecord({ id: 'del-me' }));
      postgresRepo.deleteById.mockResolvedValue(undefined);

      await service.removeIp('1.2.3.4');

      expect(postgresRepo.deleteById).toHaveBeenCalledWith('del-me');
    });

    it('throws NotFoundException when IP is missing', async () => {
      postgresRepo.findByIp.mockResolvedValue(null);
      await expect(service.removeIp('9.9.9.9')).rejects.toThrow(
        'IP 9.9.9.9 not found',
      );
    });
  });

  describe('resetAttempts', () => {
    it('resets attempts, block flag, blockedAt and paths', async () => {
      const existing = createRecord({
        blocked: true,
        attempts: 3,
        blockedAt: new Date('2024-02-01T00:00:00.000Z'),
        paths: ['/x'],
      });
      postgresRepo.findByIp.mockResolvedValue(existing);
      postgresRepo.save.mockImplementation(async (entity) => entity);

      const result = await service.resetAttempts('1.2.3.4');

      expect(result.attempts).toBe(0);
      expect(result.blocked).toBe(false);
      expect(result.blockedAt).toBeUndefined();
      expect(result.paths).toEqual([]);
    });

    it('throws NotFoundException when IP is missing', async () => {
      postgresRepo.findByIp.mockResolvedValue(null);
      await expect(service.resetAttempts('9.9.9.9')).rejects.toThrow(
        'IP 9.9.9.9 not found',
      );
    });
  });
});
