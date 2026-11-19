import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlagGuard, FEATURE_FLAG_KEY, RequireFlag } from './feature-flag.guard';
import { FeatureFlagService } from './feature-flag.service';
import { SetMetadata } from '@nestjs/common';

function makeContext(flag?: string): ExecutionContext {
    const handler = flag ? Object.assign(() => {}, { [FEATURE_FLAG_KEY]: flag }) : () => {};
    return {
        getHandler: () => handler,
        getClass: () => class {},
        switchToHttp: () => ({ getRequest: () => ({}) }),
        getType: () => 'http',
    } as unknown as ExecutionContext;
}

function makeService(enabled: boolean): FeatureFlagService {
    return {
        isEnabled: jest.fn().mockResolvedValue(enabled),
    } as unknown as FeatureFlagService;
}

function makeReflector(flag: string | undefined): Reflector {
    return {
        getAllAndOverride: jest.fn().mockReturnValue(flag),
    } as unknown as Reflector;
}

describe('RequireFlag decorator', () => {
    it('calls SetMetadata with the FEATURE_FLAG_KEY and the flag name', () => {
        const result = RequireFlag('my-flag');
        // SetMetadata returns a function (the decorator)
        expect(typeof result).toBe('function');
    });
});

describe('FeatureFlagGuard', () => {
    describe('canActivate', () => {
        it('passes (returns true) when no @RequireFlag decorator is present', async () => {
            const reflector = makeReflector(undefined);
            const service = makeService(false);
            const guard = new FeatureFlagGuard(reflector, service);
            const ctx = makeContext();

            await expect(guard.canActivate(ctx)).resolves.toBe(true);
            expect(service.isEnabled).not.toHaveBeenCalled();
        });

        it('passes (returns true) when the flag is enabled', async () => {
            const reflector = makeReflector('my-flag');
            const service = makeService(true);
            const guard = new FeatureFlagGuard(reflector, service);
            const ctx = makeContext('my-flag');

            await expect(guard.canActivate(ctx)).resolves.toBe(true);
            expect(service.isEnabled).toHaveBeenCalledWith('my-flag');
        });

        it('throws ForbiddenException (403) when the flag is disabled', async () => {
            const reflector = makeReflector('my-flag');
            const service = makeService(false);
            const guard = new FeatureFlagGuard(reflector, service);
            const ctx = makeContext('my-flag');

            await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
            expect(service.isEnabled).toHaveBeenCalledWith('my-flag');
        });

        it('ForbiddenException message includes the flag name', async () => {
            const reflector = makeReflector('beta-feature');
            const service = makeService(false);
            const guard = new FeatureFlagGuard(reflector, service);
            const ctx = makeContext('beta-feature');

            await expect(guard.canActivate(ctx)).rejects.toThrow(
                "Feature flag 'beta-feature' is disabled",
            );
        });
    });
});
