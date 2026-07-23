import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthenticatedSocket } from '@common/websocket/abstract-websocket.gateway';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(private reflector: Reflector) {
        super();
    }

    canActivate(context: ExecutionContext) {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) {
            return true;
        }

        // Handshake already validated JWT and attached user on the socket
        if (context.getType() === 'ws') {
            const client = context.switchToWs().getClient<AuthenticatedSocket>();
            const user = client.data?.user ?? client.user;
            return !!user?.id;
        }

        return super.canActivate(context);
    }

    getRequest(context: ExecutionContext) {
        const type = context.getType<string>();

        if (type === 'graphql') {
            return GqlExecutionContext.create(context).getContext().req;
        }

        if (type === 'ws') {
            const client = context.switchToWs().getClient<AuthenticatedSocket>();
            const user = client.data?.user ?? client.user;
            const rawAuth = client.handshake.headers?.authorization;
            const token =
                client.handshake.auth?.token ||
                (typeof rawAuth === 'string'
                    ? rawAuth.replace(/^Bearer\s+/i, '')
                    : undefined);

            return {
                headers: {
                    authorization: token ? `Bearer ${token}` : undefined,
                },
                user,
            };
        }

        return context.switchToHttp().getRequest();
    }
}
