import { registerAs } from '@nestjs/config';

export default registerAs('logtail', () => ({
    sourceToken: process.env.LOGTAIL_SOURCE_TOKEN || 'your-logtail-source-token',
    endpoint: process.env.LOGTAIL_ENDPOINT || 'https://s1469049.eu-nbg-2.betterstackdata.com',
}));

