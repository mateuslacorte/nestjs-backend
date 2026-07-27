import {
    Injectable,
    UnauthorizedException,
    ServiceUnavailableException,
    BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyMessage, type Hex, type Address } from 'viem';
import {
    generateSiweNonce,
    parseSiweMessage,
    validateSiweMessage,
} from 'viem/siwe';
import { CacheService } from '@common/cache/cache.service';

export interface MetamaskProfilePayload {
    metamaskId: string;
    email: string;
}

@Injectable()
export class MetamaskSiweService {
    private readonly nonceKeyPrefix = 'auth:metamask:nonce:';

    /* istanbul ignore next -- Nest DI constructor parameter emit */
    constructor(
        private readonly configService: ConfigService,
        private readonly cacheService: CacheService,
    ) {}

    assertEnabled(): void {
        if (!this.configService.get<boolean>('metamaskAuth.enabled')) {
            throw new ServiceUnavailableException(
                'MetaMask authentication is disabled',
            );
        }
    }

    async createNonce(): Promise<{ nonce: string; expiresIn: number }> {
        this.assertEnabled();

        const nonce = generateSiweNonce();
        const ttl =
            this.configService.get<number>('metamaskAuth.nonceTtlSeconds') ??
            300;

        await this.cacheService.set(
            `${this.nonceKeyPrefix}${nonce}`,
            { issued: true },
            ttl,
        );

        return { nonce, expiresIn: ttl };
    }

    async verifyAndGetProfile(
        message: string,
        signature: string,
    ): Promise<MetamaskProfilePayload> {
        this.assertEnabled();

        let fields: ReturnType<typeof parseSiweMessage>;
        try {
            fields = parseSiweMessage(message);
        } catch {
            throw new BadRequestException('Invalid SIWE message');
        }

        if (!fields?.address || !fields.nonce) {
            throw new BadRequestException('Invalid SIWE message');
        }

        if (fields.version !== '1') {
            throw new BadRequestException('SIWE version must be 1');
        }

        const expectedDomain =
            this.configService.get<string>('metamaskAuth.domain') || 'localhost';
        const expectedUri =
            this.configService.get<string>('metamaskAuth.uri') ||
            'http://localhost:3000';
        const allowedChainIds =
            this.configService.get<number[]>('metamaskAuth.chainIds') || [1];

        if (fields.domain !== expectedDomain) {
            throw new UnauthorizedException('SIWE domain mismatch');
        }

        if (fields.uri !== expectedUri) {
            throw new UnauthorizedException('SIWE URI mismatch');
        }

        if (
            typeof fields.chainId !== 'number' ||
            !allowedChainIds.includes(fields.chainId)
        ) {
            throw new UnauthorizedException('SIWE chain ID is not allowed');
        }

        const isStructurallyValid = validateSiweMessage({
            message: fields,
            domain: expectedDomain,
            nonce: fields.nonce,
            address: fields.address as Address,
        });
        if (!isStructurallyValid) {
            throw new UnauthorizedException('SIWE message validation failed');
        }

        const nonceKey = `${this.nonceKeyPrefix}${fields.nonce}`;
        const stored = await this.cacheService.get<{ issued: boolean }>(
            nonceKey,
        );
        if (!stored?.issued) {
            throw new UnauthorizedException('Invalid or expired SIWE nonce');
        }
        await this.cacheService.del(nonceKey);

        const address = fields.address.toLowerCase() as Address;
        let validSignature = false;
        try {
            validSignature = await verifyMessage({
                address,
                message,
                signature: signature as Hex,
            });
        } catch {
            throw new UnauthorizedException('Invalid SIWE signature');
        }

        if (!validSignature) {
            throw new UnauthorizedException('Invalid SIWE signature');
        }

        const metamaskId = address.toLowerCase();
        return {
            metamaskId,
            email: `${metamaskId}@users.noreply.metamask.local`,
        };
    }
}
