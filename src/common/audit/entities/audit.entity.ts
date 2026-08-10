import { Entity, Column, PrimaryColumn, Index } from 'typeorm';
import { IAuditEvent } from '../interfaces/audit.interface';

@Entity('audit')
@Index(['ip'])
@Index(['success'])
@Index(['timestamp'])
@Index(['action'])
@Index(['category'])
@Index(['timestamp', 'id'])
export class AuditEntity implements IAuditEvent {
    @PrimaryColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 128 })
    action!: string;

    @Column({ type: 'varchar', length: 64, nullable: true })
    category?: string;

    @Column({ type: 'varchar', length: 512, nullable: true })
    description?: string;

    @Column({ type: 'varchar', length: 45 })
    ip!: string;

    @Column({ type: 'int', nullable: true })
    port!: number | null;

    @Column({ type: 'boolean' })
    success!: boolean;

    @Column({ type: 'varchar', length: 64, nullable: true })
    provider?: string;

    @Column({ type: 'varchar', length: 320, nullable: true })
    identifier?: string;

    @Column({ type: 'uuid', nullable: true })
    userId?: string;

    @Column({ type: 'varchar', length: 512, nullable: true })
    failureReason?: string;

    @Column({ type: 'text', nullable: true })
    userAgent?: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata?: Record<string, unknown>;

    /**
     * When the audited action occurred (not row-insert time).
     * Covers creates, updates, and any other action type.
     */
    @Column({ type: 'timestamp with time zone' })
    timestamp!: Date;
}
