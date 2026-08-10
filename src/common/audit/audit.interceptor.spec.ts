import { of, throwError } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from './audit.service';
import { AUDIT_KEY } from './audit.constants';
import { AppRequest } from '@common/http/app-http';

jest.mock('@nestjs/graphql', () => ({
  GqlExecutionContext: {
    create: jest.fn(),
  },
}));

describe('AuditInterceptor', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let auditService: { record: jest.Mock };
  let interceptor: AuditInterceptor;

  const createContext = (
    req: Partial<AppRequest> = {},
    type: string = 'http',
  ): ExecutionContext =>
    ({
      getType: () => type,
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
      switchToHttp: () => ({
        getRequest: () =>
          ({
            headers: {},
            body: {},
            ...req,
          }) as AppRequest,
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    auditService = { record: jest.fn().mockResolvedValue(null) };
    interceptor = new AuditInterceptor(
      reflector as unknown as Reflector,
      auditService as unknown as AuditService,
    );
  });

  it('passes through when audit metadata is missing', (done) => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const next: CallHandler = { handle: () => of({ ok: true }) };

    interceptor.intercept(createContext(), next).subscribe((value) => {
      expect(value).toEqual({ ok: true });
      expect(auditService.record).not.toHaveBeenCalled();
      done();
    });
  });

  it('records success with CF IP/port and body identifier', (done) => {
    reflector.getAllAndOverride.mockReturnValue({
      action: 'auth.login',
      category: 'auth',
      description: 'Email/password login attempt',
      identifierFrom: 'email',
      userIdFrom: 'user.id',
    });
    const next: CallHandler = {
      handle: () => of({ user: { id: 'user-1' } }),
    };

    interceptor
      .intercept(
        createContext({
          headers: {
            'cf-connecting-ip': '203.0.113.10',
            'x-forwarded-port': '443',
            'user-agent': 'jest',
            'cf-device-accept-ch': 'Sec-CH-UA-Model',
          },
          body: { email: 'a@b.com', password: 'x' },
        }),
        next,
      )
      .subscribe(() => {
        expect(auditService.record).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'auth.login',
            description: 'Email/password login attempt',
            success: true,
            ip: '203.0.113.10',
            port: 443,
            identifier: 'a@b.com',
            userId: 'user-1',
            metadata: { cfDeviceAcceptCh: 'Sec-CH-UA-Model' },
          }),
        );
        done();
      });
  });

  it('prefers response userIdFrom over req.user.id', (done) => {
    reflector.getAllAndOverride.mockReturnValue({
      action: 'auth.login',
      userIdFrom: 'user.id',
    });
    const next: CallHandler = {
      handle: () => of({ user: { id: 'from-response' } }),
    };

    interceptor
      .intercept(createContext({ user: { id: 'from-jwt' } }), next)
      .subscribe(() => {
        expect(auditService.record).toHaveBeenCalledWith(
          expect.objectContaining({ userId: 'from-response' }),
        );
        done();
      });
  });

  it('falls back to req.user.id when userIdFrom is absent', (done) => {
    reflector.getAllAndOverride.mockReturnValue({
      action: 'users.update',
      category: 'users',
    });
    const next: CallHandler = { handle: () => of({ ok: true }) };

    interceptor
      .intercept(createContext({ user: { id: 'jwt-user' } }), next)
      .subscribe(() => {
        expect(auditService.record).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            userId: 'jwt-user',
          }),
        );
        done();
      });
  });

  it('records failure with req.user.id', (done) => {
    reflector.getAllAndOverride.mockReturnValue({
      action: 'auth.refresh',
      category: 'auth',
    });
    const next: CallHandler = {
      handle: () => throwError(() => new Error('Invalid refresh token')),
    };

    interceptor
      .intercept(createContext({ user: { id: 'jwt-user' } }), next)
      .subscribe({
        error: () => {
          expect(auditService.record).toHaveBeenCalledWith(
            expect.objectContaining({
              success: false,
              userId: 'jwt-user',
              failureReason: 'Invalid refresh token',
            }),
          );
          done();
        },
      });
  });

  it('stringifies non-Error failures', (done) => {
    reflector.getAllAndOverride.mockReturnValue({ action: 'auth.login' });
    const next: CallHandler = {
      handle: () => throwError(() => 'nope'),
    };

    interceptor.intercept(createContext(), next).subscribe({
      error: () => {
        expect(auditService.record).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            failureReason: 'nope',
          }),
        );
        done();
      },
    });
  });

  it('ignores non-string userId from response path', (done) => {
    reflector.getAllAndOverride.mockReturnValue({
      action: 'auth.login',
      userIdFrom: 'user.id',
    });
    const next: CallHandler = {
      handle: () => of({ user: { id: 123 } }),
    };

    interceptor.intercept(createContext(), next).subscribe(() => {
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        }),
      );
      expect(auditService.record.mock.calls[0][0].userId).toBeUndefined();
      done();
    });
  });

  it('stores first cf-device-accept-ch when header is an array', (done) => {
    reflector.getAllAndOverride.mockReturnValue({ action: 'auth.login' });
    const next: CallHandler = { handle: () => of({}) };

    interceptor
      .intercept(
        createContext({
          headers: { 'cf-device-accept-ch': ['Sec-CH-UA', 'Sec-CH-UA-Model'] },
        }),
        next,
      )
      .subscribe(() => {
        expect(auditService.record).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: { cfDeviceAcceptCh: 'Sec-CH-UA' },
          }),
        );
        done();
      });
  });

  it('uses AUDIT_KEY metadata lookup', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const next: CallHandler = { handle: () => of(null) };
    interceptor.intercept(createContext(), next).subscribe();
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      AUDIT_KEY,
      expect.any(Array),
    );
  });

  it('uses userIdParam from HTTP params on delete failure', (done) => {
    reflector.getAllAndOverride.mockReturnValue({
      action: 'user.delete',
      userIdParam: 'id',
    });
    const next: CallHandler = {
      handle: () => throwError(() => new Error('not found')),
    };

    interceptor
      .intercept(
        createContext({
          params: { id: 'target-user' },
          user: { id: 'admin' },
        }),
        next,
      )
      .subscribe({
        error: () => {
          expect(auditService.record).toHaveBeenCalledWith(
            expect.objectContaining({
              success: false,
              userId: 'target-user',
            }),
          );
          done();
        },
      });
  });

  it('resolves GraphQL request, args body, and userIdParam', (done) => {
    const gqlCreate = GqlExecutionContext.create as jest.Mock;
    gqlCreate.mockReturnValue({
      getContext: () => ({
        req: {
          headers: { 'user-agent': 'gql' },
          user: { id: 'admin' },
        },
      }),
      getArgs: () => ({
        id: 'gql-user',
        userData: { email: 'a@b.com', firstName: 'A' },
      }),
    });

    reflector.getAllAndOverride.mockReturnValue({
      action: 'user.update',
      category: 'user',
      identifierFrom: 'email',
      userIdFrom: 'id',
      userIdParam: 'id',
    });
    const next: CallHandler = {
      handle: () => of({ id: 'gql-user' }),
    };

    interceptor
      .intercept(createContext({}, 'graphql'), next)
      .subscribe(() => {
        expect(auditService.record).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'user.update',
            success: true,
            identifier: 'a@b.com',
            userId: 'gql-user',
            userAgent: 'gql',
          }),
        );
        done();
      });
  });

  it('falls back to GraphQL args as body when userData is absent', (done) => {
    const gqlCreate = GqlExecutionContext.create as jest.Mock;
    gqlCreate.mockReturnValue({
      getContext: () => ({
        req: { headers: {}, body: { email: 'from-req' } },
      }),
      getArgs: () => ({ email: 'from-args' }),
    });

    reflector.getAllAndOverride.mockReturnValue({
      action: 'auth.email.resend',
      identifierFrom: 'email',
    });
    const next: CallHandler = { handle: () => of({ ok: true }) };

    interceptor
      .intercept(createContext({}, 'graphql'), next)
      .subscribe(() => {
        expect(auditService.record).toHaveBeenCalledWith(
          expect.objectContaining({ identifier: 'from-args' }),
        );
        done();
      });
  });

  it('falls back to HTTP body when GraphQL args are null', (done) => {
    const gqlCreate = GqlExecutionContext.create as jest.Mock;
    gqlCreate.mockReturnValue({
      getContext: () => ({
        req: { headers: {}, body: { email: 'from-req-body' } },
      }),
      getArgs: () => null,
    });

    reflector.getAllAndOverride.mockReturnValue({
      action: 'auth.email.resend',
      identifierFrom: 'email',
    });
    const next: CallHandler = { handle: () => of({ ok: true }) };

    interceptor
      .intercept(createContext({}, 'graphql'), next)
      .subscribe(() => {
        expect(auditService.record).toHaveBeenCalledWith(
          expect.objectContaining({ identifier: 'from-req-body' }),
        );
        done();
      });
  });

  it('falls back to HTTP request when GraphQL context has no req', (done) => {
    const gqlCreate = GqlExecutionContext.create as jest.Mock;
    gqlCreate.mockReturnValue({
      getContext: () => ({}),
      getArgs: () => ({}),
    });

    reflector.getAllAndOverride.mockReturnValue({ action: 'user.create' });
    const next: CallHandler = { handle: () => of({ id: '1' }) };

    interceptor
      .intercept(
        createContext({
          headers: { 'user-agent': 'http-fallback' },
          body: {},
        }, 'graphql'),
        next,
      )
      .subscribe(() => {
        expect(auditService.record).toHaveBeenCalledWith(
          expect.objectContaining({
            userAgent: 'http-fallback',
          }),
        );
        done();
      });
  });
});
