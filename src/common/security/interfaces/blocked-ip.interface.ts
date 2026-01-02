export interface IBlockedIp {
    id: string;
    ip: string;
    attempts: number;
    blocked: boolean;
    blockedAt?: Date;
    lastAttemptAt: Date;
    paths: string[];           // Últimas rotas tentadas
    userAgent?: string;
    createdAt?: Date;
    updatedAt?: Date;
}
