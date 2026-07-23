import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplicationContext } from '@nestjs/common';
import { ServerOptions } from 'socket.io';
import { createCorsOriginDelegate } from '@config/cors-origins.util';

/**
 * Applies the same CORS allowlist as HTTP (self + CORS_ORIGINS) to Socket.IO.
 */
export class CorsIoAdapter extends IoAdapter {
    constructor(
        app: INestApplicationContext,
        private readonly allowedOrigins: string[],
        private readonly credentials = true,
    ) {
        super(app);
    }

    createIOServer(port: number, options?: Partial<ServerOptions>) {
        return super.createIOServer(port, {
            ...options,
            cors: {
                origin: createCorsOriginDelegate(this.allowedOrigins),
                credentials: this.credentials,
            },
        });
    }
}
