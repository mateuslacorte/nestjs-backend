export interface IAuditEvent {
    id: string;
    /** Stable action name, e.g. auth.login, auth.register, user.update */
    action: string;
    /** Optional grouping, e.g. auth, security, billing */
    category?: string;
    /** Human-readable summary from @Audit({ description }) */
    description?: string;
    ip: string;
    /** Origin TCP / forwarded port when available */
    port: number | null;
    success: boolean;
    provider?: string;
    /** Email/username/address as submitted (truncated) */
    identifier?: string;
    userId?: string;
    failureReason?: string;
    userAgent?: string;
    /** Extensible payload (Cloudflare metadata, request ids, etc.) */
    metadata?: Record<string, unknown>;
    /**
     * When the audited action occurred (create, update, login, etc.).
     * Independent of row persistence time.
     */
    timestamp: Date;
}

export interface RecordAuditEventInput {
    action: string;
    category?: string;
    description?: string;
    ip: string;
    port: number | null;
    success: boolean;
    provider?: string;
    identifier?: string;
    userId?: string;
    failureReason?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
    /** Override action time; defaults to now when recording */
    timestamp?: Date;
}

export interface AuditCursorPayload {
    c: string;
    i: string;
}

export interface SearchAuditEventsQuery {
    cursor?: string;
    limit?: number;
    q?: string;
    ip?: string;
    success?: boolean;
    action?: string;
    category?: string;
    userId?: string;
    provider?: string;
}

export interface AuditPage {
    items: IAuditEvent[];
    nextCursor: string | null;
}

/**
 * Internal repo search after the service has decoded the cursor and clamped limit.
 */
export interface AuditSearchRepoFilter {
    limit: number;
    cursorTimestamp?: Date;
    cursorId?: string;
    q?: string;
    ip?: string;
    success?: boolean;
    action?: string;
    category?: string;
    userId?: string;
    provider?: string;
}

/**
 * Options for the `@Audit()` decorator.
 * The interceptor records success/failure around the handler using request context.
 */
export interface AuditOptions {
    /** Stable action name stored on the event */
    action: string;
    category?: string;
    /** Human-readable summary stored on the event */
    description?: string;
    /** Static provider (e.g. oauth provider name) */
    provider?: string;
    /**
     * Dot-path(s) on `request.body` to resolve an identifier.
     * First non-empty string wins.
     */
    identifierFrom?: string | string[];
    /** Dot-path on `request.body` for provider */
    providerFrom?: string;
    /** Dot-path on the handler response for userId (success only) */
    userIdFrom?: string;
    /**
     * HTTP route param or GraphQL arg name used as userId fallback
     * (e.g. delete/update when response lacks id, or on failure).
     */
    userIdParam?: string;
}
