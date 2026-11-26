import { NotFoundException } from '@nestjs/common';
import { OperationStatusService } from './operation-status.service';

function makeRedis() {
  return {
    setex: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
  };
}

describe('OperationStatusService', () => {
  let redis: ReturnType<typeof makeRedis>;
  let service: OperationStatusService;

  beforeEach(() => {
    redis = makeRedis();
    service = new OperationStatusService(redis as never);
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('pending()', () => {
    it('writes a pending entry with PENDING_TTL (3600s)', async () => {
      await service.pending('op-1');
      expect(redis.setex).toHaveBeenCalledWith(
        'op:status:op-1',
        3600,
        expect.stringContaining('"status":"pending"'),
      );
    });
  });

  describe('complete()', () => {
    it('writes a completed entry with TTL 86400s', async () => {
      await service.complete('op-2');
      expect(redis.setex).toHaveBeenCalledWith(
        'op:status:op-2',
        86400,
        expect.stringContaining('"status":"completed"'),
      );
    });

    it('preserves startedAt from an existing entry', async () => {
      const existing = JSON.stringify({ operationId: 'op-3', status: 'pending', startedAt: 999, updatedAt: 999 });
      redis.get.mockResolvedValue(existing);
      await service.complete('op-3', { userId: 'u1' });
      const written = JSON.parse((redis.setex as jest.Mock).mock.calls[0][2] as string);
      expect(written.startedAt).toBe(999);
      expect(written.result).toEqual({ userId: 'u1' });
    });

    it('uses Date.now() for startedAt when no existing entry', async () => {
      redis.get.mockResolvedValue(null);
      await service.complete('op-4');
      const written = JSON.parse((redis.setex as jest.Mock).mock.calls[0][2] as string);
      expect(written.startedAt).toBe(1_700_000_000_000);
    });
  });

  describe('fail()', () => {
    it('writes a failed entry with TTL 86400s', async () => {
      await service.fail('op-5', 'something broke');
      expect(redis.setex).toHaveBeenCalledWith(
        'op:status:op-5',
        86400,
        expect.stringContaining('"status":"failed"'),
      );
    });

    it('includes the error message', async () => {
      await service.fail('op-6', 'timeout');
      const written = JSON.parse((redis.setex as jest.Mock).mock.calls[0][2] as string);
      expect(written.error).toBe('timeout');
    });

    it('preserves startedAt from existing entry', async () => {
      redis.get.mockResolvedValue(JSON.stringify({ operationId: 'op-7', status: 'pending', startedAt: 42, updatedAt: 42 }));
      await service.fail('op-7', 'err');
      const written = JSON.parse((redis.setex as jest.Mock).mock.calls[0][2] as string);
      expect(written.startedAt).toBe(42);
    });
  });

  describe('get()', () => {
    it('returns the parsed OperationStatus when found', async () => {
      const entry = { operationId: 'op-8', status: 'completed', startedAt: 1, updatedAt: 2, result: null };
      redis.get.mockResolvedValue(JSON.stringify(entry));
      const result = await service.get('op-8');
      expect(result).toEqual(entry);
    });

    it('throws NotFoundException when entry does not exist', async () => {
      redis.get.mockResolvedValue(null);
      await expect(service.get('missing')).rejects.toThrow(NotFoundException);
    });

    it('returns null (via getOrNull) when redis.get throws', async () => {
      redis.get.mockRejectedValue(new Error('redis down'));
      await expect(service.get('err-op')).rejects.toThrow(NotFoundException);
    });
  });
});
