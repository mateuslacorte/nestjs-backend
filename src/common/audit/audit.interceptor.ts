import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AppRequest } from '@common/http/app-http';
import {
    getClientIp,
    getClientPort,
} from '@common/security/utils/client-ip.util';
import { AUDIT_KEY } from './audit.constants';
import { AuditOptions } from './interfaces/audit.interface';
import { AuditService } from './audit.service';
import { firstStringFromPaths, getByPath } from './utils/path.util';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
    constructor(
        private readonly reflector: Reflector,
        private readonly auditService: AuditService,
    ) {}

    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<unknown> {
        const options = this.reflector.getAllAndOverride<
            AuditOptions | undefined
        >(AUDIT_KEY, [context.getHandler(), context.getClass()]);

        if (!options?.action) {
            return next.handle();
        }

        const req = this.resolveRequest(context);
        const body = this.resolveBody(context, req);
        const userAgentHeader = req.headers['user-agent'];
        const userAgent =
            typeof userAgentHeader === 'string' ? userAgentHeader : undefined;
        const cfDeviceAcceptCh = req.headers['cf-device-accept-ch'];
        const metadata: Record<string, unknown> = {};
        if (cfDeviceAcceptCh != null) {
            metadata.cfDeviceAcceptCh = Array.isArray(cfDeviceAcceptCh)
                ? cfDeviceAcceptCh[0]
                : cfDeviceAcceptCh;
        }

        const requestUserId = this.requestUserId(req);
        const paramUserId = this.resolveParamUserId(context, req, options);

        const base = {
            action: options.action,
            category: options.category,
            description: options.description,
            ip: getClientIp(req),
            port: getClientPort(req),
            userAgent,
            identifier: firstStringFromPaths(body, options.identifierFrom),
            provider:
                options.provider ??
                firstStringFromPaths(body, options.providerFrom),
            metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        };

        return next.handle().pipe(
            tap({
                next: (result) => {
                    void this.auditService.record({
                        ...base,
                        success: true,
                        userId:
                            this.resolveUserId(result, options.userIdFrom) ??
                            paramUserId ??
                            requestUserId,
                    });
                },
                error: (error: unknown) => {
                    void this.auditService.record({
                        ...base,
                        success: false,
                        userId: paramUserId ?? requestUserId,
                        failureReason:
                            error instanceof Error
                                ? error.message
                                : String(error),
                    });
                },
            }),
        );
    }

    private resolveRequest(context: ExecutionContext): AppRequest {
        if (context.getType<string>() === 'graphql') {
            const gqlCtx = GqlExecutionContext.create(context);
            const gqlRequest = gqlCtx.getContext<{ req?: AppRequest }>()?.req;
            if (gqlRequest) {
                return gqlRequest;
            }
        }
        return context.switchToHttp().getRequest<AppRequest>();
    }

    private resolveBody(
        context: ExecutionContext,
        req: AppRequest,
    ): unknown {
        if (context.getType<string>() === 'graphql') {
            const args = GqlExecutionContext.create(context).getArgs<
                Record<string, unknown>
            >();
            if (args?.userData && typeof args.userData === 'object') {
                return args.userData;
            }
            return args ?? req.body;
        }
        return req.body as unknown;
    }

    private resolveParamUserId(
        context: ExecutionContext,
        req: AppRequest,
        options: AuditOptions,
    ): string | undefined {
        const paramName = options.userIdParam;
        if (!paramName) {
            return undefined;
        }

        if (context.getType<string>() === 'graphql') {
            const args = GqlExecutionContext.create(context).getArgs<
                Record<string, unknown>
            >();
            const fromArgs = args?.[paramName];
            if (typeof fromArgs === 'string') {
                return fromArgs;
            }
        }

        const params = req.params as Record<string, unknown> | undefined;
        const fromParams = params?.[paramName];
        return typeof fromParams === 'string' ? fromParams : undefined;
    }

    private requestUserId(req: AppRequest): string | undefined {
        const user = req.user as { id?: unknown } | undefined;
        return typeof user?.id === 'string' ? user.id : undefined;
    }

    private resolveUserId(
        result: unknown,
        userIdFrom?: string,
    ): string | undefined {
        if (!userIdFrom) {
            return undefined;
        }
        const value = getByPath(result, userIdFrom);
        return typeof value === 'string' ? value : undefined;
    }
}
