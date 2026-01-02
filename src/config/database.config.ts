import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
    // MongoDB configuration
    mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/database',
    
    // PostgreSQL configuration
    postgres: {
        type: 'postgres' as const,
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
        username: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || '',
        database: process.env.POSTGRES_DB || 'database',
        synchronize: process.env.POSTGRES_SYNCHRONIZE === 'true' || false,
    },
}));
