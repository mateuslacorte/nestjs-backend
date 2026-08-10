import { registerAs } from '@nestjs/config';

function requireSecret(
    value: string | undefined,
    name: string,
    fallback: string,
): string {
    const env = (process.env.NODE_ENV || process.env.APP_ENV || '').toLowerCase();
    const isProd = env === 'production' || env === 'prod';
    if (value?.trim()) {
        return value.trim();
    }
    if (isProd) {
        throw new Error(
            `${name} must be set in production (no insecure fallback)`,
        );
    }
    return fallback;
}

export default registerAs('jwt', () => {
    const secret = requireSecret(
        process.env.JWT_SECRET,
        'JWT_SECRET',
        'fallback-secret-key',
    );
    // Never silently reuse JWT_SECRET for refresh — require distinct secret in prod
    const refreshSecret = requireSecret(
        process.env.JWT_REFRESH_SECRET,
        'JWT_REFRESH_SECRET',
        'fallback-refresh-secret-key',
    );

    return {
        secret,
        expirationTime: process.env.JWT_EXPIRATION_TIME || '1h',
        refreshSecret,
        refreshExpirationTime: process.env.JWT_REFRESH_EXPIRATION_TIME || '7d',
        /** Max random seconds added to JWT TTL (0 … N) to spread expirations. */
        jitterSeconds: parseInt(process.env.JWT_JITTER_SECONDS || '60', 10),
    };
});
