import { registerAs } from '@nestjs/config';

const apiVersion = process.env.API_VERSION || 'v1';

export default registerAs('app', () => ({
    name: process.env.APP_NAME || 'NestJS Backend API',
    environment: process.env.NODE_ENV || 'development',
    host: process.env.HOST || 'localhost',
    port: parseInt(process.env.PORT!, 10) || 3000,
    apiVersion,
    apiPrefix: `api/${apiVersion}`,
}));
