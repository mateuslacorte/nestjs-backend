import { AuditService } from './audit.service';
import { AuditPostgresRepository } from './repositories/postgres.repository';
import { encodeAuditCursor } from './utils/cursor.util';

jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomUUID: () => 'fixed-audit-event-id',
}));

describe('AuditService', () => {
  let postgresRepo: {
    create: jest.Mock;
    search: jest.Mock;
  };
  let service: AuditService;

  beforeEach(() => {
    postgresRepo = {
      create: jest.fn(),
      search: jest.fn(),
    };
    service = new AuditService(
      postgresRepo as unknown as AuditPostgresRepository,
    );
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  describe('record', () => {
    it('persists a truncated audit event with timestamp', async () => {
      const saved = { id: 'fixed-audit-event-id' };
      postgresRepo.create.mockResolvedValue(saved);
      const timestamp = new Date('2026-08-10T12:00:00.000Z');

      const result = await service.record({
        action: 'auth.login',
        category: 'auth',
        description: 'd'.repeat(600),
        ip: '1.2.3.4',
        port: 443,
        success: true,
        identifier: 'a'.repeat(400),
        failureReason: 'b'.repeat(600),
        userAgent: 'jest',
        timestamp,
      });

      expect(result).toBe(saved);
      expect(postgresRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'fixed-audit-event-id',
          action: 'auth.login',
          description: 'd'.repeat(512),
          identifier: 'a'.repeat(320),
          failureReason: 'b'.repeat(512),
          timestamp,
        }),
      );
    });

    it('defaults timestamp to now when omitted', async () => {
      postgresRepo.create.mockResolvedValue({ id: 'fixed-audit-event-id' });
      const before = Date.now();

      await service.record({
        action: 'user.update',
        ip: '1.1.1.1',
        port: null,
        success: true,
      });

      const after = Date.now();
      const call = postgresRepo.create.mock.calls[0][0] as { timestamp: Date };
      expect(call.timestamp.getTime()).toBeGreaterThanOrEqual(before);
      expect(call.timestamp.getTime()).toBeLessThanOrEqual(after);
    });

    it('defaults action to unknown when missing', async () => {
      postgresRepo.create.mockResolvedValue({ id: 'fixed-audit-event-id' });

      await service.record({
        action: undefined as unknown as string,
        ip: '1.1.1.1',
        port: null,
        success: true,
      });

      expect(postgresRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'unknown' }),
      );
    });

    it('returns null and logs when persistence fails', async () => {
      postgresRepo.create.mockRejectedValue(new Error('db down'));

      await expect(
        service.record({
          action: 'auth.login',
          ip: '1.1.1.1',
          port: null,
          success: false,
        }),
      ).resolves.toBeNull();
    });

    it('stringifies non-Error failures', async () => {
      postgresRepo.create.mockRejectedValue('boom');

      await expect(
        service.record({
          action: 'auth.login',
          ip: '1.1.1.1',
          port: null,
          success: false,
        }),
      ).resolves.toBeNull();
    });
  });

  describe('search', () => {
    it('returns a page without nextCursor when under limit', async () => {
      const timestamp = new Date('2026-08-10T12:00:00.000Z');
      postgresRepo.search.mockResolvedValue([
        { id: '1', timestamp, action: 'auth.login' },
      ]);

      await expect(service.search({ limit: 50 })).resolves.toEqual({
        items: [{ id: '1', timestamp, action: 'auth.login' }],
        nextCursor: null,
      });
      expect(postgresRepo.search).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 51 }),
      );
    });

    it('emits nextCursor when more rows exist', async () => {
      const t1 = new Date('2026-08-10T12:00:00.000Z');
      const t2 = new Date('2026-08-10T11:00:00.000Z');
      postgresRepo.search.mockResolvedValue([
        { id: 'a', timestamp: t1 },
        { id: 'b', timestamp: t2 },
        { id: 'c', timestamp: t2 },
      ]);

      const page = await service.search({ limit: 2 });
      expect(page.items).toHaveLength(2);
      expect(page.nextCursor).toBe(encodeAuditCursor(t2, 'b'));
    });

    it('decodes cursor and passes filters', async () => {
      const timestamp = new Date('2026-08-01T00:00:00.000Z');
      const cursor = encodeAuditCursor(timestamp, 'prev');
      postgresRepo.search.mockResolvedValue([]);

      await service.search({
        cursor,
        q: 'login',
        ip: '1.1.1.1',
        success: true,
        action: 'auth.login',
        category: 'auth',
        userId: 'u1',
        provider: 'google',
      });

      expect(postgresRepo.search).toHaveBeenCalledWith(
        expect.objectContaining({
          cursorTimestamp: timestamp,
          cursorId: 'prev',
          q: 'login',
          ip: '1.1.1.1',
          success: true,
          action: 'auth.login',
          category: 'auth',
          userId: 'u1',
          provider: 'google',
        }),
      );
    });
  });
});
