import { Test } from '@nestjs/testing';
import { FeatureFlagService } from './feature-flag.service';

type MockRedis = {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
};

function createRedis(): MockRedis {
    return {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
    };
}

describe('FeatureFlagService', () => {
    let redis: MockRedis;
    let service: FeatureFlagService;

    beforeEach(() => {
        redis = createRedis();
        service = new FeatureFlagService(redis as never);
    });

    describe('isEnabled — global flag', () => {
        it('returns true when global key is "1"', async () => {
            redis.get.mockResolvedValue('1');
            await expect(service.isEnabled('my-flag')).resolves.toBe(true);
            expect(redis.get).toHaveBeenCalledWith('feature_flag:my-flag');
        });

        it('returns true when global key is "true"', async () => {
            redis.get.mockResolvedValue('true');
            await expect(service.isEnabled('my-flag')).resolves.toBe(true);
        });

        it('returns false when global key has a non-truthy value', async () => {
            redis.get.mockResolvedValue('0');
            await expect(service.isEnabled('my-flag')).resolves.toBe(false);
        });

        it('returns false when global key is absent', async () => {
            redis.get.mockResolvedValue(null);
            await expect(service.isEnabled('my-flag')).resolves.toBe(false);
        });
    });

    describe('isEnabled — per-user override', () => {
        it('returns true when user key is "1" (overrides absent global)', async () => {
            redis.get
                .mockResolvedValueOnce('1')   // user key
            await expect(
                service.isEnabled('my-flag', { userId: 'u1' }),
            ).resolves.toBe(true);
            expect(redis.get).toHaveBeenCalledWith('feature_flag:my-flag:user:u1');
        });

        it('returns true when user key is "1" even though global is absent', async () => {
            redis.get.mockResolvedValueOnce('1');
            await expect(
                service.isEnabled('flag', { userId: 'u1' }),
            ).resolves.toBe(true);
            // global key was never called because user key resolved the check
            expect(redis.get).toHaveBeenCalledTimes(1);
        });

        it('falls through to global when user key is absent', async () => {
            redis.get
                .mockResolvedValueOnce(null)  // user key → no override
                .mockResolvedValueOnce('1');  // global key
            await expect(
                service.isEnabled('flag', { userId: 'u1' }),
            ).resolves.toBe(true);
            expect(redis.get).toHaveBeenCalledTimes(2);
        });

        it('returns false when user key is absent and global is absent', async () => {
            redis.get
                .mockResolvedValueOnce(null)  // user key
                .mockResolvedValueOnce(null); // global key
            await expect(
                service.isEnabled('flag', { userId: 'u1' }),
            ).resolves.toBe(false);
        });

        it('user override with non-truthy value returns false', async () => {
            redis.get.mockResolvedValueOnce('disabled');
            await expect(
                service.isEnabled('flag', { userId: 'u1' }),
            ).resolves.toBe(false);
            expect(redis.get).toHaveBeenCalledTimes(1);
        });
    });

    describe('isEnabled — per-tenant override', () => {
        it('returns true when tenant key is "1"', async () => {
            redis.get.mockResolvedValueOnce('1');
            await expect(
                service.isEnabled('flag', { tenantId: 't1' }),
            ).resolves.toBe(true);
            expect(redis.get).toHaveBeenCalledWith('feature_flag:flag:tenant:t1');
        });

        it('returns true when tenant key is "true"', async () => {
            redis.get.mockResolvedValueOnce('true');
            await expect(
                service.isEnabled('flag', { tenantId: 't1' }),
            ).resolves.toBe(true);
        });

        it('falls through to global when tenant key is absent', async () => {
            redis.get
                .mockResolvedValueOnce(null)  // tenant key → no override
                .mockResolvedValueOnce('1');  // global key
            await expect(
                service.isEnabled('flag', { tenantId: 't1' }),
            ).resolves.toBe(true);
        });

        it('returns false when tenant key is absent and global is absent', async () => {
            redis.get
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(null);
            await expect(
                service.isEnabled('flag', { tenantId: 't1' }),
            ).resolves.toBe(false);
        });

        it('tenant override with non-truthy value returns false', async () => {
            redis.get.mockResolvedValueOnce('0');
            await expect(
                service.isEnabled('flag', { tenantId: 't1' }),
            ).resolves.toBe(false);
            expect(redis.get).toHaveBeenCalledTimes(1);
        });
    });

    describe('isEnabled — user overrides tenant when both provided', () => {
        it('uses user key when both userId and tenantId are provided and user key exists', async () => {
            redis.get.mockResolvedValueOnce('1');
            await expect(
                service.isEnabled('flag', { userId: 'u1', tenantId: 't1' }),
            ).resolves.toBe(true);
            expect(redis.get).toHaveBeenCalledWith('feature_flag:flag:user:u1');
            expect(redis.get).toHaveBeenCalledTimes(1);
        });

        it('falls through to tenant key when user key is absent', async () => {
            redis.get
                .mockResolvedValueOnce(null) // user key absent
                .mockResolvedValueOnce('1'); // tenant key present
            await expect(
                service.isEnabled('flag', { userId: 'u1', tenantId: 't1' }),
            ).resolves.toBe(true);
            expect(redis.get).toHaveBeenCalledWith('feature_flag:flag:user:u1');
            expect(redis.get).toHaveBeenCalledWith('feature_flag:flag:tenant:t1');
        });
    });

    describe('enable', () => {
        it('sets global key to "1" when no target', async () => {
            redis.set.mockResolvedValue('OK');
            await service.enable('my-flag');
            expect(redis.set).toHaveBeenCalledWith('feature_flag:my-flag', '1');
        });

        it('sets per-user key to "1"', async () => {
            redis.set.mockResolvedValue('OK');
            await service.enable('my-flag', { userId: 'u1' });
            expect(redis.set).toHaveBeenCalledWith('feature_flag:my-flag:user:u1', '1');
        });

        it('sets per-tenant key to "1"', async () => {
            redis.set.mockResolvedValue('OK');
            await service.enable('my-flag', { tenantId: 't1' });
            expect(redis.set).toHaveBeenCalledWith('feature_flag:my-flag:tenant:t1', '1');
        });
    });

    describe('disable', () => {
        it('deletes global key when no target', async () => {
            redis.del.mockResolvedValue(1);
            await service.disable('my-flag');
            expect(redis.del).toHaveBeenCalledWith('feature_flag:my-flag');
        });

        it('deletes per-user key', async () => {
            redis.del.mockResolvedValue(1);
            await service.disable('my-flag', { userId: 'u1' });
            expect(redis.del).toHaveBeenCalledWith('feature_flag:my-flag:user:u1');
        });

        it('deletes per-tenant key', async () => {
            redis.del.mockResolvedValue(1);
            await service.disable('my-flag', { tenantId: 't1' });
            expect(redis.del).toHaveBeenCalledWith('feature_flag:my-flag:tenant:t1');
        });
    });
});

describe('FeatureFlagService — NestJS DI context', () => {
    it('resolves from the DI container', async () => {
        const mockRedis = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
        const moduleRef = await Test.createTestingModule({
            providers: [
                FeatureFlagService,
                { provide: 'REDIS_CLIENT', useValue: mockRedis },
            ],
        }).compile();
        expect(moduleRef.get(FeatureFlagService)).toBeInstanceOf(FeatureFlagService);
        await moduleRef.close();
    });
});
