import { registerAs } from '@nestjs/config';

export default registerAs('jitsi', () => ({
    baseUrl: process.env.JITSI_BASE_URL || 'https://meet.jit.si',
}));

