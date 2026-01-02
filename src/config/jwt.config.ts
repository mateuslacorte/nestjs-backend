import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
    secret: process.env.JWT_SECRET || 'fallback-secret-key',
    expirationTime: process.env.JWT_EXPIRATION_TIME || '1h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'fallback-refresh-secret-key',
    refreshExpirationTime: process.env.JWT_REFRESH_EXPIRATION_TIME || '7d',
}));

