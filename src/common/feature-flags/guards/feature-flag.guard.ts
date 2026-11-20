import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlagService } from '../feature-flag.service';
import { FEATURE_FLAG_KEY } from '../decorators/require-flag.decorator';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly featureFlagService: FeatureFlagService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const flag = this.reflector.getAllAndOverride<string>(FEATURE_FLAG_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!flag) return true;

        const enabled = await this.featureFlagService.isEnabled(flag);
        if (!enabled) {
            throw new ForbiddenException(`Feature '${flag}' is disabled.`);
        }

        return true;
    }
}
