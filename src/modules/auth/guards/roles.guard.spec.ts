import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ROLES_KEY } from '@modules/auth/decorators/roles.decorator';
import { Role } from '@modules/auth/enums/role.enum';
import { AuthenticatedSocket } from '@common/websocket/abstract-websocket.gateway';
import { RolesGuard } from './roles.guard';

jest.mock('@nestjs/graphql', () => ({
  GqlExecutionContext: {
    create: jest.fn(),
  },
  registerEnumType: jest.fn(),
}));

const mockGqlExecutionContextCreate = GqlExecutionContext.create as jest.Mock;

function createReflector(roles?: Role[]): Reflector {
  return {
    getAllAndOverride: jest.fn((key: string) => {
      if (key === ROLES_KEY) return roles;
      return undefined;
    }),
  } as unknown as Reflector;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = createReflector();
    guard = new RolesGuard(reflector);
    mockGqlExecutionContextCreate.mockReset();
  });

  describe('canActivate', () => {
    it('returns true when no roles are required', () => {
      reflector = createReflector(undefined);
      guard = new RolesGuard(reflector);

      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        getType: jest.fn(() => 'http'),
        switchToHttp: () => ({
          getRequest: () => ({ user: { roles: [Role.USER] } }),
        }),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(context)).toBe(true);
    });

    it('returns true when user has a matching required role', () => {
      reflector = createReflector([Role.ADMIN]);
      guard = new RolesGuard(reflector);

      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        getType: jest.fn(() => 'http'),
        switchToHttp: () => ({
          getRequest: () => ({
            user: { roles: [Role.USER, Role.ADMIN] },
          }),
        }),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(context)).toBe(true);
    });

    it('returns false when user roles are missing', () => {
      reflector = createReflector([Role.ADMIN]);
      guard = new RolesGuard(reflector);

      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        getType: jest.fn(() => 'http'),
        switchToHttp: () => ({
          getRequest: () => ({ user: {} }),
        }),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(context)).toBe(false);
    });

    it('returns false when user is missing', () => {
      reflector = createReflector([Role.ADMIN]);
      guard = new RolesGuard(reflector);

      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        getType: jest.fn(() => 'http'),
        switchToHttp: () => ({
          getRequest: () => ({}),
        }),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(context)).toBe(false);
    });

    it('returns false when user has no matching role', () => {
      reflector = createReflector([Role.SUPER]);
      guard = new RolesGuard(reflector);

      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        getType: jest.fn(() => 'http'),
        switchToHttp: () => ({
          getRequest: () => ({
            user: { roles: [Role.USER, Role.MANAGER] },
          }),
        }),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(context)).toBe(false);
    });

    it('returns true when any one of multiple required roles matches', () => {
      reflector = createReflector([Role.ADMIN, Role.MANAGER]);
      guard = new RolesGuard(reflector);

      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        getType: jest.fn(() => 'http'),
        switchToHttp: () => ({
          getRequest: () => ({
            user: { roles: [Role.MANAGER] },
          }),
        }),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(context)).toBe(true);
    });

    it('extracts user from graphql context', () => {
      reflector = createReflector([Role.ADMIN]);
      guard = new RolesGuard(reflector);

      mockGqlExecutionContextCreate.mockReturnValue({
        getContext: () => ({
          req: { user: { roles: [Role.ADMIN] } },
        }),
      });

      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        getType: jest.fn(() => 'graphql'),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(context)).toBe(true);
      expect(mockGqlExecutionContextCreate).toHaveBeenCalledWith(context);
    });

    it('extracts user from ws socket data', () => {
      reflector = createReflector([Role.USER]);
      guard = new RolesGuard(reflector);

      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        getType: jest.fn(() => 'ws'),
        switchToWs: () => ({
          getClient: () =>
            ({
              data: { user: { roles: [Role.USER] } },
            }) as AuthenticatedSocket,
        }),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(context)).toBe(true);
    });

    it('extracts user from ws socket.user when data.user is absent', () => {
      reflector = createReflector([Role.USER]);
      guard = new RolesGuard(reflector);

      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        getType: jest.fn(() => 'ws'),
        switchToWs: () => ({
          getClient: () =>
            ({
              user: { roles: [Role.USER] },
            }) as AuthenticatedSocket,
        }),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(context)).toBe(true);
    });

    it('returns false for ws when user lacks required role', () => {
      reflector = createReflector([Role.SUPER]);
      guard = new RolesGuard(reflector);

      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        getType: jest.fn(() => 'ws'),
        switchToWs: () => ({
          getClient: () =>
            ({
              data: { user: { roles: [Role.USER] } },
            }) as AuthenticatedSocket,
        }),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(context)).toBe(false);
    });
  });
});
