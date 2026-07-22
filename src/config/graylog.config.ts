import { registerAs } from '@nestjs/config';

export default registerAs('graylog', () => ({
    enabled: process.env.GRAYLOG_ENABLED !== 'false',
    endpoint: process.env.GRAYLOG_ENDPOINT || 'http://localhost:12201/gelf',
    host: process.env.GRAYLOG_HOST || process.env.APP_NAME || 'backend',
    facility: process.env.GRAYLOG_FACILITY || 'nestjs',
    timeout: Number(process.env.GRAYLOG_TIMEOUT || 3000),
}));
