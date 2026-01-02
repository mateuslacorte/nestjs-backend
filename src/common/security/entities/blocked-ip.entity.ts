import {
    Entity,
    Column,
    PrimaryColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';
import { IBlockedIp } from '../interfaces/blocked-ip.interface';

@Entity('blocked_ips')
@Index(['ip'], { unique: true })
@Index(['blocked'])
export class BlockedIpEntity implements IBlockedIp {
    @PrimaryColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 45 })
    ip!: string;

    @Column({ type: 'int', default: 0 })
    attempts!: number;

    @Column({ type: 'boolean', default: false })
    blocked!: boolean;

    @Column({ type: 'timestamp with time zone', nullable: true })
    blockedAt?: Date;

    @Column({ type: 'timestamp with time zone' })
    lastAttemptAt!: Date;

    @Column({ type: 'simple-array' })
    paths!: string[];

    @Column({ type: 'text', nullable: true })
    userAgent?: string;

    @CreateDateColumn({ type: 'timestamp with time zone' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp with time zone' })
    updatedAt!: Date;
}
