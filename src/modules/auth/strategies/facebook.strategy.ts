import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy, Profile } from 'passport-facebook';

export interface FacebookProfilePayload {
    facebookId: string;
    email: string;
    firstName: string;
    lastName: string;
}

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
    constructor(configService: ConfigService) {
        super({
            clientID: configService.get<string>('facebookOAuth.appId') || 'disabled',
            clientSecret:
                configService.get<string>('facebookOAuth.appSecret') || 'disabled',
            callbackURL:
                configService.get<string>('facebookOAuth.callbackUrl') ||
                'http://localhost:3000/api/v1/auth/facebook/callback',
            scope: ['email', 'public_profile'],
            profileFields: ['id', 'emails', 'name', 'displayName'],
        });
    }

    validate(
        _accessToken: string,
        _refreshToken: string,
        profile: Profile,
        done: (error: Error | null, user?: FacebookProfilePayload) => void,
    ): void {
        const email = profile.emails?.[0]?.value;
        if (!email) {
            done(new Error('Facebook account did not provide an email'), undefined);
            return;
        }

        const payload: FacebookProfilePayload = {
            facebookId: profile.id,
            email,
            firstName: profile.name?.givenName || profile.displayName || 'User',
            lastName: profile.name?.familyName || '',
        };

        done(null, payload);
    }
}
