import { registerAs } from '@nestjs/config';

export default registerAs('smtp', () => {
    const user = process.env.SMTP_USER || '';
    const pass = process.env.SMTP_PASSWORD || '';

    return {
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        requireTLS: process.env.SMTP_REQUIRE_TLS !== 'false',
        auth: user
            ? { user, pass }
            : undefined,
        from: process.env.SMTP_FROM || user || 'noreply@example.com',
    };
});
