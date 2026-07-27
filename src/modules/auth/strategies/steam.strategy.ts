import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy as PassportStrategyBase } from 'passport-strategy';
import { Request } from 'express';
import axios from 'axios';

export interface SteamProfilePayload {
    steamId: string;
    email: string;
    firstName: string;
    lastName: string;
}

const STEAM_OPENID_ENDPOINT = 'https://steamcommunity.com/openid/login';
const STEAM_CLAIMED_ID_PREFIX = 'https://steamcommunity.com/openid/id/';
const STEAM_ID64_RE = /^7656119\d{10}$/;

type DoneCallback = (
    err: Error | null,
    user?: SteamProfilePayload | false,
) => void;

interface SteamStrategyOptions {
    returnURL: string;
    realm: string;
    apiKey: string;
}

/**
 * Passport strategy for Steam OpenID 2.0 (not OAuth2).
 * Steam never returns email — we use a stable synthetic address per steamId.
 */
/** Exported for unit tests — Steam OpenID 2.0 passport strategy (not OAuth2). */
export class SteamOpenIdPassportStrategy extends PassportStrategyBase {
    name = 'steam';
    private readonly returnURL: string;
    private readonly realm: string;
    private readonly apiKey: string;
    private readonly verify: (
        profile: SteamProfilePayload,
        done: DoneCallback,
    ) => void;

    constructor(
        options: SteamStrategyOptions,
        verify: (profile: SteamProfilePayload, done: DoneCallback) => void,
    ) {
        super();
        this.returnURL = options.returnURL;
        this.realm = options.realm;
        this.apiKey = options.apiKey;
        this.verify = verify;
    }

    authenticate(req: Request, options?: { state?: string }): void {
        const mode = typeof req.query['openid.mode'] === 'string'
            ? req.query['openid.mode']
            : undefined;

        if (mode === 'id_res' || req.path.includes('/steam/callback')) {
            void this.handleCallback(req);
            return;
        }

        const state = options?.state || '';
        const separator = this.returnURL.includes('?') ? '&' : '?';
        const returnTo = state
            ? `${this.returnURL}${separator}state=${encodeURIComponent(state)}`
            : this.returnURL;

        const params = new URLSearchParams({
            'openid.ns': 'http://specs.openid.net/auth/2.0',
            'openid.mode': 'checkid_setup',
            'openid.return_to': returnTo,
            'openid.realm': this.realm,
            'openid.identity':
                'http://specs.openid.net/auth/2.0/identifier_select',
            'openid.claimed_id':
                'http://specs.openid.net/auth/2.0/identifier_select',
        });

        this.redirect(`${STEAM_OPENID_ENDPOINT}?${params.toString()}`);
    }

    private async handleCallback(req: Request): Promise<void> {
        try {
            const profile = await this.verifyAndBuildProfile(req);
            this.verify(profile, (err, user) => {
                if (err) {
                    this.error(err);
                    return;
                }
                if (!user) {
                    this.fail();
                    return;
                }
                this.success(user);
            });
        } catch (err) {
            this.error(err instanceof Error ? err : new Error(String(err)));
        }
    }

    private async verifyAndBuildProfile(
        req: Request,
    ): Promise<SteamProfilePayload> {
        const q = req.query;
        const mode = String(q['openid.mode'] || '');
        if (mode !== 'id_res') {
            throw new Error('Invalid Steam OpenID mode');
        }

        const opEndpoint = String(q['openid.op_endpoint'] || '');
        if (opEndpoint !== STEAM_OPENID_ENDPOINT) {
            throw new Error('Invalid Steam OpenID endpoint');
        }

        const claimedId = String(q['openid.claimed_id'] || '');
        if (!claimedId.startsWith(STEAM_CLAIMED_ID_PREFIX)) {
            throw new Error('Invalid Steam claimed_id');
        }
        const steamId = claimedId.slice(STEAM_CLAIMED_ID_PREFIX.length);
        if (!STEAM_ID64_RE.test(steamId)) {
            throw new Error('Invalid Steam ID');
        }

        const returnTo = String(q['openid.return_to'] || '');
        if (
            returnTo !== this.returnURL &&
            !returnTo.startsWith(`${this.returnURL}?`) &&
            !returnTo.startsWith(`${this.returnURL}&`)
        ) {
            throw new Error('Steam OpenID return_to mismatch');
        }

        const body = new URLSearchParams();
        for (const [key, value] of Object.entries(q)) {
            if (!key.startsWith('openid.') || value === undefined) {
                continue;
            }
            const v = Array.isArray(value) ? value[0] : value;
            if (typeof v !== 'string') {
                continue;
            }
            body.append(key, key === 'openid.mode' ? 'check_authentication' : v);
        }

        const { data: verification } = await axios.post<string>(
            STEAM_OPENID_ENDPOINT,
            body.toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                responseType: 'text',
            },
        );

        if (!/is_valid\s*:\s*true/i.test(verification)) {
            throw new Error('Steam OpenID verification failed');
        }

        let firstName = 'Steam';
        let lastName = '';

        if (this.apiKey) {
            try {
                const { data } = await axios.get<{
                    response?: {
                        players?: Array<{
                            personaname?: string;
                            realname?: string;
                        }>;
                    };
                }>(
                    'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/',
                    {
                        params: {
                            key: this.apiKey,
                            steamids: steamId,
                        },
                    },
                );
                const player = data?.response?.players?.[0];
                if (player?.realname?.trim()) {
                    const parts = player.realname.trim().split(/\s+/).filter(Boolean);
                    firstName = parts[0] || player.personaname || 'Steam';
                    lastName = parts.slice(1).join(' ');
                } else if (player?.personaname?.trim()) {
                    firstName = player.personaname.trim();
                }
            } catch {
                // Profile enrichment is optional; OpenID identity is enough
            }
        }

        return {
            steamId,
            // Steam does not expose email; stable synthetic address for account upsert
            email: `${steamId}@users.noreply.steamcommunity.com`,
            firstName,
            lastName,
        };
    }
}

@Injectable()
export class SteamStrategy extends PassportStrategy(
    SteamOpenIdPassportStrategy,
    'steam',
) {
    constructor(configService: ConfigService) {
        super({
            returnURL:
                configService.get<string>('steamOpenId.callbackUrl') ||
                'http://localhost:3000/api/v1/auth/steam/callback',
            realm:
                configService.get<string>('steamOpenId.realm') ||
                'http://localhost:3000/',
            apiKey: configService.get<string>('steamOpenId.apiKey') || '',
        });
    }

    async validate(profile: SteamProfilePayload): Promise<SteamProfilePayload> {
        return profile;
    }
}
