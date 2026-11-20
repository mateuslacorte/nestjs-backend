import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

export enum OutboxStatus {
  PENDING = 'pending',
  PUBLISHED = 'published',
  FAILED = 'failed',
}

@Entity('outbox_entries')
@Index(['status', 'createdAt'])
export class OutboxEntry {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 128 })
  aggregateType!: string;

  @Column({ type: 'varchar', length: 36 })
  aggregateId!: string;

  @Column({ type: 'varchar', length: 128 })
  eventType!: string;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @Column({
    type: 'enum',
    enum: OutboxStatus,
    default: OutboxStatus.PENDING,
  })
  status!: OutboxStatus;

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  publishedAt!: Date | null;

  @Column({ type: 'int', default: 0 })
  retries!: number;
}
