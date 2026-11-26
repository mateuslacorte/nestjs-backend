import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { sanitizeUserForResponse } from '@modules/users/utils/sanitize-user-response.util';

interface JwtPayload {
  id: string;
  email: string;
  roles: string[];
  sub?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    /* istanbul ignore next -- Nest DI constructor parameter emit */
    constructor(
        private configService: ConfigService,
        private authService: AuthService
    ) {
        const secret = configService.get<string>('jwt.secret')?.trim();
        if (!secret) {
            throw new Error(
                'jwt.secret must be configured (JWT_SECRET is required)',
            );
        }
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: secret,
        });
    }

    async validate(payload: JwtPayload) {
        const user = await this.authService.validateUserById(payload.id);
        if (!user) {
            throw new UnauthorizedException();
        }
        return sanitizeUserForResponse(user);
    }
}
