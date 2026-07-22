import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
    // MongoDB configuration
    mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/database',
    mongo: {
        maxPoolSize: parseInt(process.env.MONGO_POOL_MAX || '10', 10),
        minPoolSize: parseInt(process.env.MONGO_POOL_MIN || '0', 10),
        maxIdleTimeMS: parseInt(process.env.MONGO_POOL_IDLE || '30000', 10),
        waitQueueTimeoutMS: parseInt(process.env.MONGO_POOL_TIMEOUT || '5000', 10),
    },

    // PostgreSQL configuration
    postgres: {
        type: 'postgres' as const,
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
        username: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || '',
        database: process.env.POSTGRES_DB || 'database',
        synchronize: process.env.POSTGRES_SYNCHRONIZE === 'true' || false,
        poolSize: parseInt(process.env.POSTGRES_POOL_MAX || '10', 10),
        extra: {
            max: parseInt(process.env.POSTGRES_POOL_MAX || '10', 10),
            min: parseInt(process.env.POSTGRES_POOL_MIN || '2', 10),
            idleTimeoutMillis: parseInt(process.env.POSTGRES_POOL_IDLE || '30000', 10),
            connectionTimeoutMillis: parseInt(process.env.POSTGRES_POOL_TIMEOUT || '5000', 10),
        },
    },
}));
