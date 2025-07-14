import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
    appName: process.env.APP_NAME || 'Backend',
    environment: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT!, 10) || 3000,
    logLevel: process.env.LOG_LEVEL || 'info',
    apiPrefix: process.env.API_PREFIX || 'api',
    graphqlPlayground: process.env.GRAPHQL_PLAYGROUND === 'true',
}));
