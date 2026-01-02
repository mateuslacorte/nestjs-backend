import { registerAs } from '@nestjs/config';

export default registerAs('smtp', () => ({
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    requireTLS: process.env.SMTP_REQUIRE_TLS !== 'false',
    auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASSWORD || '',
    },
    from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@example.com',
}));

