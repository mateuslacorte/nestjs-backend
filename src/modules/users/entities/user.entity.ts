import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    Index,
} from 'typeorm';
import { Role } from '@modules/auth/enums/role.enum';
import { IUser } from '../interfaces/user.interface';

@Entity('users')
@Index(['createdAt', 'id'])
export class UserEntity implements IUser {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ unique: true })
    username!: string;

    @Column()
    firstName!: string;

    @Column()
    lastName!: string;

    @Column({ unique: true })
    email!: string;

    @Column({ type: 'varchar', nullable: true })
    password!: string | null;

    @Column({ default: true })
    isActive!: boolean;

    @Column('simple-array')
    roles!: Role[];

    @Column({ type: 'varchar', unique: true, nullable: true })
    googleId?: string | null;

    @Column({ type: 'varchar', unique: true, nullable: true })
    facebookId?: string | null;

    @Column({ type: 'varchar', unique: true, nullable: true })
    twitterId?: string | null;

    @Column({ type: 'varchar', unique: true, nullable: true })
    githubId?: string | null;

    @Column({ type: 'varchar', unique: true, nullable: true })
    figmaId?: string | null;

    @Column({ type: 'varchar', unique: true, nullable: true })
    linkedinId?: string | null;

    @Column({ type: 'varchar', unique: true, nullable: true })
    slackId?: string | null;

    @Column({ type: 'varchar', unique: true, nullable: true })
    atlassianId?: string | null;

    @Column({ type: 'varchar', unique: true, nullable: true })
    gitlabId?: string | null;

    @Column({ type: 'varchar', unique: true, nullable: true })
    bitbucketId?: string | null;

    @Column({ type: 'varchar', unique: true, nullable: true })
    discordId?: string | null;

    @Column({ type: 'varchar', unique: true, nullable: true })
    twitchId?: string | null;

    @Column({ type: 'varchar', unique: true, nullable: true })
    steamId?: string | null;

    @Column({ type: 'varchar', unique: true, nullable: true })
    redditId?: string | null;

    @Column({ type: 'varchar', unique: true, nullable: true })
    appleId?: string | null;

    @Column({ type: 'varchar', unique: true, nullable: true })
    amazonId?: string | null;


    @Column({ type: 'varchar', unique: true, nullable: true })
    patreonId?: string | null;

    @Column({ type: 'varchar', unique: true, nullable: true })
    dropboxId?: string | null;

    @Column({ type: 'varchar', unique: true, nullable: true })
    metamaskId?: string | null;

    @Column({ type: 'varchar', unique: true, nullable: true })
    activeDirectoryId?: string | null;

    @Column({ nullable: true })
    passwordResetToken?: string;

    @Column({ type: 'timestamp', nullable: true })
    passwordResetExpires?: Date;

    @Column({ nullable: true })
    emailVerificationToken?: string;

    @Column({ type: 'timestamp', nullable: true })
    emailVerificationExpires?: Date;

    @CreateDateColumn({ type: 'timestamp with time zone' })
    createdAt!: Date;
}
