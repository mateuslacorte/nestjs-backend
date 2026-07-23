import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';

export interface GoogleProfilePayload {
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(configService: ConfigService) {
        super({
            clientID: configService.get<string>('googleOAuth.clientId') || 'disabled',
            clientSecret:
                configService.get<string>('googleOAuth.clientSecret') || 'disabled',
            callbackURL:
                configService.get<string>('googleOAuth.callbackUrl') ||
                'http://localhost:3000/api/v1/auth/google/callback',
            scope: ['email', 'profile'],
        });
    }

    validate(
        _accessToken: string,
        _refreshToken: string,
        profile: Profile,
        done: VerifyCallback,
    ): void {
        const email = profile.emails?.[0]?.value;
        if (!email) {
            done(new Error('Google account did not provide an email'), undefined);
            return;
        }

        const payload: GoogleProfilePayload = {
            googleId: profile.id,
            email,
            firstName: profile.name?.givenName || profile.displayName || 'User',
            lastName: profile.name?.familyName || '',
        };

        done(null, payload);
    }
}
