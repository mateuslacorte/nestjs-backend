import { registerAs } from '@nestjs/config';

export default registerAs('kafka', () => ({
    clientId: process.env.KAFKA_CLIENT_ID || 'my-client',
    brokers: process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['localhost:9092'],
    groupId: process.env.KAFKA_GROUP_ID || 'my-group',
    ssl: process.env.KAFKA_SSL === 'true',
    sasl: {
        mechanism: process.env.KAFKA_SASL_MECHANISM || 'plain',
        username: process.env.KAFKA_SASL_USERNAME || '',
        password: process.env.KAFKA_SASL_PASSWORD || '',
    },
    retry: {
        initialRetryTime: 300,
        retries: 8,
    },
}));
