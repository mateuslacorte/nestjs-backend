import * as argon2 from 'argon2';

export interface Argon2HashOptions {
    memoryCost?: number;
    timeCost?: number;
    parallelism?: number;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
    const parsed = parseInt(value ?? '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function resolveArgon2Options(
    overrides?: Argon2HashOptions,
): Required<Argon2HashOptions> {
    return {
        memoryCost:
            overrides?.memoryCost ??
            parsePositiveInt(process.env.ARGON2_MEMORY_COST, 19456),
        timeCost:
            overrides?.timeCost ??
            parsePositiveInt(process.env.ARGON2_TIME_COST, 2),
        parallelism:
            overrides?.parallelism ??
            parsePositiveInt(process.env.ARGON2_PARALLELISM, 1),
    };
}

export function isPasswordHashed(value: string): boolean {
    return /^\$argon2(id|i|d)\$/.test(value);
}

export async function hashPassword(
    plain: string,
    options?: Argon2HashOptions,
): Promise<string> {
    const resolved = resolveArgon2Options(options);
    return argon2.hash(plain, {
        type: argon2.argon2id,
        memoryCost: resolved.memoryCost,
        timeCost: resolved.timeCost,
        parallelism: resolved.parallelism,
    });
}

export async function verifyPassword(
    plain: string,
    hash: string,
): Promise<boolean> {
    try {
        return await argon2.verify(hash, plain);
    } catch {
        return false;
    }
}
