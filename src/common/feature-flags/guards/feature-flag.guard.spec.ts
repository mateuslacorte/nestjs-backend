import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlagGuard } from './feature-flag.guard';
import { FeatureFlagService } from '../feature-flag.service';
import { FEATURE_FLAG_KEY } from '../decorators/require-flag.decorator';

function makeContext(): ExecutionContext {
    return {
        getHandler: () => ({}),
        getClass: () => ({}),
    } as unknown as ExecutionContext;
}

describe('FeatureFlagGuard', () => {
    let guard: FeatureFlagGuard;
    let reflector: { getAllAndOverride: jest.Mock };
    let service: { isEnabled: jest.Mock };

    beforeEach(() => {
        reflector = { getAllAndOverride: jest.fn() };
        service = { isEnabled: jest.fn().mockResolvedValue(true) };
        guard = new FeatureFlagGuard(
            reflector as unknown as Reflector,
            service as unknown as FeatureFlagService,
        );
    });

    it('passes through when no decorator is present', async () => {
        reflector.getAllAndOverride.mockReturnValue(undefined);
        await expect(guard.canActivate(makeContext())).resolves.toBe(true);
        expect(service.isEnabled).not.toHaveBeenCalled();
    });

    it('passes through when flag is enabled', async () => {
        reflector.getAllAndOverride.mockReturnValue('new-ui');
        service.isEnabled.mockResolvedValue(true);
        await expect(guard.canActivate(makeContext())).resolves.toBe(true);
        expect(service.isEnabled).toHaveBeenCalledWith('new-ui');
        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
            FEATURE_FLAG_KEY,
            expect.any(Array),
        );
    });

    it('throws ForbiddenException when flag is disabled', async () => {
        reflector.getAllAndOverride.mockReturnValue('new-ui');
        service.isEnabled.mockResolvedValue(false);
        await expect(guard.canActivate(makeContext())).rejects.toThrow(ForbiddenException);
    });

    it('ForbiddenException message mentions the flag name', async () => {
        reflector.getAllAndOverride.mockReturnValue('beta-feature');
        service.isEnabled.mockResolvedValue(false);
        await expect(guard.canActivate(makeContext())).rejects.toThrow(
            "Feature 'beta-feature' is disabled.",
        );
    });
});
