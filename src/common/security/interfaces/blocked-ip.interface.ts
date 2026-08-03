export interface IBlockedIp {
    id: string;
    ip: string;
    attempts: number;
    blocked: boolean;
    blockedAt?: Date;
    lastAttemptAt: Date;
    paths: string[];           // Most recent attempted routes
    userAgent?: string;
    createdAt?: Date;
    updatedAt?: Date;
}
