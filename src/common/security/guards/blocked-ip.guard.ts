import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { AppRequest } from '@common/http/app-http';
import { SecurityService } from '../security.service';
import { getClientIp } from '../utils/client-ip.util';

/**
 * Rejects HTTP requests from IPs previously blocked via invalid-route probing.
 */
@Injectable()
export class BlockedIpGuard implements CanActivate {
    constructor(private readonly securityService: SecurityService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        if (context.getType() !== 'http') {
            return true;
        }

        const req = context.switchToHttp().getRequest<AppRequest>();
        const ip = getClientIp(req);

        if (await this.securityService.isIpBlocked(ip)) {
            throw new ForbiddenException(
                'Access blocked. Your IP was flagged for suspicious behavior.',
            );
        }

        return true;
    }
}
