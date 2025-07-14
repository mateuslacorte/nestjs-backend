import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service'; // Import AuthService to verify user with JWT

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        private authService: AuthService
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Extract JWT from authorization header
            ignoreExpiration: false, // Don't ignore expiration
            secretOrKey: configService.get<string>('JWT_SECRET'), // Get the secret key from the config
        });
    }

    // Validate the payload by checking if the user exists
    async validate(payload: any) {
        // Assuming 'id' is the unique user identifier in your JWT token payload
        const user = await this.authService.validateUserById(payload.id);
        if (!user) {
            throw new Error('Unauthorized'); // or any specific error handling
        }
        return user;
    }
}
