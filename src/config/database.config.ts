import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
    mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/mongo', // MongoDB URI (for writing)
    postgresUri: process.env.POSTGRES_URI || 'postgres://user:password@localhost:5432/postgres', // PostgreSQL URI (for reading)
}));
