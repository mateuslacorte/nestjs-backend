import { FeatureFlagService } from './feature-flag.service';

describe('FeatureFlagService', () => {
    let service: FeatureFlagService;
    let redis: { get: jest.Mock; set: jest.Mock; del: jest.Mock };

    beforeEach(() => {
        redis = {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue('OK'),
            del: jest.fn().mockResolvedValue(1),
        };
        service = new FeatureFlagService(redis as never);
    });

    describe('isEnabled — global flag', () => {
        it('returns true when global key is "1"', async () => {
            redis.get.mockResolvedValue('1');
            expect(await service.isEnabled('my-flag')).toBe(true);
            expect(redis.get).toHaveBeenCalledWith('feature_flag:my-flag');
        });

        it('returns true when global key is "true"', async () => {
            redis.get.mockResolvedValue('true');
            expect(await service.isEnabled('my-flag')).toBe(true);
        });

        it('returns false when global key is absent (null)', async () => {
            redis.get.mockResolvedValue(null);
            expect(await service.isEnabled('my-flag')).toBe(false);
        });

        it('returns false when global key has unexpected value', async () => {
            redis.get.mockResolvedValue('0');
            expect(await service.isEnabled('my-flag')).toBe(false);
        });
    });

    describe('isEnabled — per-user override', () => {
        it('returns true when user key is "1" even if global is absent', async () => {
            redis.get.mockImplementation((key: string) => {
                if (key === 'feature_flag:my-flag:user:u1') return Promise.resolve('1');
                return Promise.resolve(null);
            });
            expect(await service.isEnabled('my-flag', { userId: 'u1' })).toBe(true);
            expect(redis.get).toHaveBeenCalledWith('feature_flag:my-flag:user:u1');
            expect(redis.get).toHaveBeenCalledTimes(1);
        });

        it('returns false when user key is "0" even if global is "1"', async () => {
            redis.get.mockImplementation((key: string) => {
                if (key === 'feature_flag:my-flag:user:u1') return Promise.resolve('0');
                return Promise.resolve('1');
            });
            expect(await service.isEnabled('my-flag', { userId: 'u1' })).toBe(false);
        });

        it('falls through to global when user key is absent', async () => {
            redis.get.mockImplementation((key: string) => {
                if (key === 'feature_flag:my-flag') return Promise.resolve('1');
                return Promise.resolve(null);
            });
            expect(await service.isEnabled('my-flag', { userId: 'u1' })).toBe(true);
            expect(redis.get).toHaveBeenCalledWith('feature_flag:my-flag:user:u1');
            expect(redis.get).toHaveBeenCalledWith('feature_flag:my-flag');
        });
    });

    describe('isEnabled — per-tenant override', () => {
        it('returns true when tenant key is "1" even if global is absent', async () => {
            redis.get.mockImplementation((key: string) => {
                if (key === 'feature_flag:my-flag:tenant:t1') return Promise.resolve('1');
                return Promise.resolve(null);
            });
            expect(await service.isEnabled('my-flag', { tenantId: 't1' })).toBe(true);
            expect(redis.get).toHaveBeenCalledWith('feature_flag:my-flag:tenant:t1');
        });

        it('returns false when tenant key is "0" even if global is "1"', async () => {
            redis.get.mockImplementation((key: string) => {
                if (key === 'feature_flag:my-flag:tenant:t1') return Promise.resolve('0');
                return Promise.resolve('1');
            });
            expect(await service.isEnabled('my-flag', { tenantId: 't1' })).toBe(false);
        });

        it('falls through to global when tenant key is absent', async () => {
            redis.get.mockImplementation((key: string) => {
                if (key === 'feature_flag:my-flag') return Promise.resolve('1');
                return Promise.resolve(null);
            });
            expect(await service.isEnabled('my-flag', { tenantId: 't1' })).toBe(true);
        });

        it('user key takes precedence over tenant key', async () => {
            redis.get.mockImplementation((key: string) => {
                if (key === 'feature_flag:my-flag:user:u1') return Promise.resolve('0');
                if (key === 'feature_flag:my-flag:tenant:t1') return Promise.resolve('1');
                return Promise.resolve(null);
            });
            expect(
                await service.isEnabled('my-flag', { userId: 'u1', tenantId: 't1' }),
            ).toBe(false);
            // user key was checked; tenant key was NOT checked since user key was present
            expect(redis.get).not.toHaveBeenCalledWith('feature_flag:my-flag:tenant:t1');
        });
    });

    describe('enable', () => {
        it('sets global key when no target provided', async () => {
            await service.enable('my-flag');
            expect(redis.set).toHaveBeenCalledWith('feature_flag:my-flag', '1');
        });

        it('sets user key when userId provided', async () => {
            await service.enable('my-flag', { userId: 'u1' });
            expect(redis.set).toHaveBeenCalledWith('feature_flag:my-flag:user:u1', '1');
        });

        it('sets tenant key when tenantId provided', async () => {
            await service.enable('my-flag', { tenantId: 't1' });
            expect(redis.set).toHaveBeenCalledWith('feature_flag:my-flag:tenant:t1', '1');
        });

        it('sets user key (not tenant) when both provided', async () => {
            await service.enable('my-flag', { userId: 'u1', tenantId: 't1' });
            expect(redis.set).toHaveBeenCalledWith('feature_flag:my-flag:user:u1', '1');
        });
    });

    describe('disable', () => {
        it('deletes global key when no target provided', async () => {
            await service.disable('my-flag');
            expect(redis.del).toHaveBeenCalledWith('feature_flag:my-flag');
        });

        it('deletes user key when userId provided', async () => {
            await service.disable('my-flag', { userId: 'u1' });
            expect(redis.del).toHaveBeenCalledWith('feature_flag:my-flag:user:u1');
        });

        it('deletes tenant key when tenantId provided', async () => {
            await service.disable('my-flag', { tenantId: 't1' });
            expect(redis.del).toHaveBeenCalledWith('feature_flag:my-flag:tenant:t1');
        });

        it('deletes user key (not tenant) when both provided', async () => {
            await service.disable('my-flag', { userId: 'u1', tenantId: 't1' });
            expect(redis.del).toHaveBeenCalledWith('feature_flag:my-flag:user:u1');
        });
    });
});
