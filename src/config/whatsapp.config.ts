import { registerAs } from '@nestjs/config';

export default registerAs('whatsapp', () => ({
    url: process.env.EVOLUTION_API_URL || 'localhost',
    instance: process.env.EVOLUTION_API_INSTANCE || 'default',
    key: process.env.EVOLUTION_API_KEY || '',
}));
