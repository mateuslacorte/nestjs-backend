import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../enums/role.enum';
import { AuthenticatedSocket } from '@common/websocket/abstract-websocket.gateway';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredRoles) {
            return true;
        }

        const request = this.getRequest(context);
        const user = request?.user;
        const userRoles = user?.roles;
        return (
            !!userRoles &&
            requiredRoles.some((role) => userRoles.includes(role))
        );
    }

    private getRequest(context: ExecutionContext): { user?: { roles?: Role[] } } {
        const type = context.getType<string>();

        if (type === 'graphql') {
            return GqlExecutionContext.create(context).getContext().req;
        }

        if (type === 'ws') {
            const client = context.switchToWs().getClient<AuthenticatedSocket>();
            return { user: client.data?.user ?? client.user };
        }

        return context.switchToHttp().getRequest();
    }
}
