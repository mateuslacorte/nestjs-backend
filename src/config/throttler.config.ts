import { registerAs } from '@nestjs/config';

export default registerAs('throttler', () => ({
    ttl: parseInt(process.env.THROTTLER_TTL || '60000', 10),
    limit: parseInt(process.env.THROTTLER_LIMIT || '120', 10),
}));
