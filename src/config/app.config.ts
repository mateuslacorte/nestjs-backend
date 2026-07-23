import { registerAs } from '@nestjs/config';

const apiVersion = process.env.API_VERSION || 'v1';

export default registerAs('app', () => ({
    name: process.env.APP_NAME || 'NestJS Backend API',
    environment: process.env.NODE_ENV || 'development',
    host: process.env.HOST || 'localhost',
    port: parseInt(process.env.PORT!, 10) || 3000,
    /** Public site origin for canonical / Open Graph URLs (e.g. https://nestjs.lacorte.dev) */
    publicUrl: (process.env.APP_URL || process.env.PUBLIC_URL || '').replace(
        /\/$/,
        '',
    ),
    apiVersion,
    apiPrefix: `api/${apiVersion}`,
}));
