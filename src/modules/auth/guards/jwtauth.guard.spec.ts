import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { IS_PUBLIC_KEY } from '@modules/auth/decorators/public.decorator';
import { AuthenticatedSocket } from '@common/websocket/abstract-websocket.gateway';
import { JwtAuthGuard } from './jwtauth.guard';

jest.mock('@nestjs/graphql', () => ({
  GqlExecutionContext: {
    create: jest.fn(),
  },
}));

const mockGqlExecutionContextCreate = GqlExecutionContext.create as jest.Mock;

function createReflector(isPublic = false): Reflector {
  return {
    getAllAndOverride: jest.fn((key: string) => {
      if (key === IS_PUBLIC_KEY) return isPublic;
      return undefined;
    }),
  } as unknown as Reflector;
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;
  let superCanActivate: jest.SpyInstance;

  beforeEach(() => {
    reflector = createReflector(false);
    guard = new JwtAuthGuard(reflector);
    superCanActivate = jest
      .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
      .mockReturnValue(true);
    mockGqlExecutionContextCreate.mockReset();
  });

  afterEach(() => {
    superCanActivate.mockRestore();
  });

  describe('canActivate', () => {
    it('returns true for public routes without calling super', () => {
      reflector = createReflector(true);
      guard = new JwtAuthGuard(reflector);
      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        getType: jest.fn(() => 'http'),
      } as unknown as ExecutionContext;

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(superCanActivate).not.toHaveBeenCalled();
    });

    it('returns true for ws context when user has id on socket data', () => {
      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        getType: jest.fn(() => 'ws'),
        switchToWs: () => ({
          getClient: () =>
            ({
              data: { user: { id: 'user-1' } },
            }) as AuthenticatedSocket,
        }),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(context)).toBe(true);
      expect(superCanActivate).not.toHaveBeenCalled();
    });

    it('returns true for ws context when user has id on socket.user', () => {
      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        getType: jest.fn(() => 'ws'),
        switchToWs: () => ({
          getClient: () =>
            ({
              user: { id: 'user-2' },
            }) as AuthenticatedSocket,
        }),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(context)).toBe(true);
    });

    it('returns false for ws context when user is missing', () => {
      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        getType: jest.fn(() => 'ws'),
        switchToWs: () => ({
          getClient: () => ({}) as AuthenticatedSocket,
        }),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(context)).toBe(false);
      expect(superCanActivate).not.toHaveBeenCalled();
    });

    it('returns false for ws context when user has no id', () => {
      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        getType: jest.fn(() => 'ws'),
        switchToWs: () => ({
          getClient: () =>
            ({
              data: { user: { email: 'a@b.com' } },
            }) as AuthenticatedSocket,
        }),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(context)).toBe(false);
    });

    it('delegates to super.canActivate for non-public http routes', () => {
      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        getType: jest.fn(() => 'http'),
      } as unknown as ExecutionContext;

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(superCanActivate).toHaveBeenCalledWith(context);
    });

    it('delegates to super.canActivate for non-public graphql routes', () => {
      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        getType: jest.fn(() => 'graphql'),
      } as unknown as ExecutionContext;

      guard.canActivate(context);

      expect(superCanActivate).toHaveBeenCalledWith(context);
    });
  });

  describe('getRequest', () => {
    it('returns http request for http context', () => {
      const req = { headers: { authorization: 'Bearer http-token' } };
      const context = {
        getType: jest.fn(() => 'http'),
        switchToHttp: () => ({ getRequest: () => req }),
      } as unknown as ExecutionContext;

      expect(guard.getRequest(context)).toBe(req);
    });

    it('returns graphql request from GqlExecutionContext', () => {
      const req = { headers: { authorization: 'Bearer gql-token' } };
      mockGqlExecutionContextCreate.mockReturnValue({
        getContext: () => ({ req }),
      });
      const context = {
        getType: jest.fn(() => 'graphql'),
      } as unknown as ExecutionContext;

      expect(guard.getRequest(context)).toBe(req);
      expect(mockGqlExecutionContextCreate).toHaveBeenCalledWith(context);
    });

    it('builds ws request from handshake.auth.token', () => {
      const user = { id: 'ws-user' };
      const context = {
        getType: jest.fn(() => 'ws'),
        switchToWs: () => ({
          getClient: () =>
            ({
              data: { user },
              handshake: {
                auth: { token: 'ws-auth-token' },
                headers: {},
              },
            }) as AuthenticatedSocket,
        }),
      } as unknown as ExecutionContext;

      expect(guard.getRequest(context)).toEqual({
        headers: { authorization: 'Bearer ws-auth-token' },
        user,
      });
    });

    it('builds ws request from Bearer authorization header when auth.token is missing', () => {
      const user = { id: 'ws-user-2' };
      const context = {
        getType: jest.fn(() => 'ws'),
        switchToWs: () => ({
          getClient: () =>
            ({
              user,
              handshake: {
                headers: { authorization: 'Bearer header-token' },
              },
            }) as AuthenticatedSocket,
        }),
      } as unknown as ExecutionContext;

      expect(guard.getRequest(context)).toEqual({
        headers: { authorization: 'Bearer header-token' },
        user,
      });
    });

    it('strips Bearer prefix from ws authorization header token', () => {
      const context = {
        getType: jest.fn(() => 'ws'),
        switchToWs: () => ({
          getClient: () =>
            ({
              handshake: {
                headers: { authorization: 'bearer raw-token' },
              },
            }) as AuthenticatedSocket,
        }),
      } as unknown as ExecutionContext;

      expect(guard.getRequest(context)).toEqual({
        headers: { authorization: 'Bearer raw-token' },
        user: undefined,
      });
    });

    it('returns undefined authorization when ws has no token', () => {
      const context = {
        getType: jest.fn(() => 'ws'),
        switchToWs: () => ({
          getClient: () =>
            ({
              handshake: { headers: {} },
            }) as AuthenticatedSocket,
        }),
      } as unknown as ExecutionContext;

      expect(guard.getRequest(context)).toEqual({
        headers: { authorization: undefined },
        user: undefined,
      });
    });

    it('prefers handshake.auth.token over authorization header on ws', () => {
      const context = {
        getType: jest.fn(() => 'ws'),
        switchToWs: () => ({
          getClient: () =>
            ({
              handshake: {
                auth: { token: 'preferred-token' },
                headers: { authorization: 'Bearer other-token' },
              },
            }) as AuthenticatedSocket,
        }),
      } as unknown as ExecutionContext;

      expect(guard.getRequest(context).headers.authorization).toBe(
        'Bearer preferred-token',
      );
    });
  });
});
