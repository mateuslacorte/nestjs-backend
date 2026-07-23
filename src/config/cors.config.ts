import { registerAs } from '@nestjs/config';
import { buildSelfOrigins, parseOriginList } from './cors-origins.util';

export default registerAs('cors', () => {
    const port = parseInt(process.env.PORT || '3000', 10);
    const selfOrigins = buildSelfOrigins({
        host: process.env.HOST,
        port: Number.isFinite(port) ? port : 3000,
        publicUrl: process.env.APP_URL || process.env.PUBLIC_URL,
    });
    const extraOrigins = parseOriginList(process.env.CORS_ORIGINS);
    const origins = [...new Set([...selfOrigins, ...extraOrigins])];

    return {
        /** Always-allowed: this app (HOST/PORT, APP_URL). */
        selfOrigins,
        /** Extra clients from CORS_ORIGINS only. */
        extraOrigins,
        /** Full allowlist used by HTTP + WebSocket. */
        origins,
        credentials: true,
    };
});
