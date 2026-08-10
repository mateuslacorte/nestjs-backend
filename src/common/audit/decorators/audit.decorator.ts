import { applyDecorators, SetMetadata, UseInterceptors } from '@nestjs/common';
import { AuditOptions } from '../interfaces/audit.interface';
import { AuditInterceptor } from '../audit.interceptor';
import { AUDIT_KEY } from '../audit.constants';

export { AUDIT_KEY };

/**
 * Records an audit event for the decorated HTTP handler (success and failure).
 * Captures Cloudflare-aware client IP/port from the request automatically.
 *
 * @example
 * ```ts
 * @Audit({
 *   action: 'auth.login',
 *   category: 'auth',
 *   description: 'Email/password login attempt',
 *   identifierFrom: 'email',
 *   userIdFrom: 'user.id',
 * })
 * @Post('login')
 * async login(@Body() dto: LoginDto) { ... }
 * ```
 */
export function Audit(options: AuditOptions) {
    return applyDecorators(
        SetMetadata(AUDIT_KEY, options),
        UseInterceptors(AuditInterceptor),
    );
}
