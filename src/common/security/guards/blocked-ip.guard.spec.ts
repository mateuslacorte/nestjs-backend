jest.mock('uuid', () => ({
  v4: () => 'fixed-uuid',
}));

import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AppRequest } from '@common/http/app-http';
import { BlockedIpGuard } from './blocked-ip.guard';

function createHttpContext(req: Partial<AppRequest>): ExecutionContext {
  return {
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => req as AppRequest,
    }),
  } as unknown as ExecutionContext;
}

describe('BlockedIpGuard', () => {
  let guard: BlockedIpGuard;
  let securityService: { isIpBlocked: jest.Mock };

  beforeEach(() => {
    securityService = { isIpBlocked: jest.fn().mockResolvedValue(false) };
    guard = new BlockedIpGuard(securityService as never);
  });

  it('allows non-http contexts', async () => {
    const context = {
      getType: () => 'ws',
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(securityService.isIpBlocked).not.toHaveBeenCalled();
  });

  it('allows requests when IP is not blocked', async () => {
    await expect(
      guard.canActivate(createHttpContext({ ip: '1.2.3.4', headers: {} })),
    ).resolves.toBe(true);
    expect(securityService.isIpBlocked).toHaveBeenCalledWith('1.2.3.4');
  });

  it('throws ForbiddenException when IP is blocked', async () => {
    securityService.isIpBlocked.mockResolvedValue(true);

    await expect(
      guard.canActivate(createHttpContext({ ip: '1.2.3.4', headers: {} })),
    ).rejects.toThrow(ForbiddenException);
  });
});
