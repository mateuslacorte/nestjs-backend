import { registerAs } from '@nestjs/config';

function parsePositiveInt(value: string | undefined, fallback: number): number {
    const parsed = parseInt(value ?? '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export default registerAs('argon2', () => ({
    memoryCost: parsePositiveInt(process.env.ARGON2_MEMORY_COST, 19456),
    timeCost: parsePositiveInt(process.env.ARGON2_TIME_COST, 2),
    parallelism: parsePositiveInt(process.env.ARGON2_PARALLELISM, 1),
}));
