import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from '@modules/auth/enums/role.enum';
import { IUser } from '../interfaces/user.interface';

@Entity('users')
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

    @Column({ nullable: true })
    passwordResetToken?: string;

    @Column({ type: 'timestamp', nullable: true })
    passwordResetExpires?: Date;

    @Column({ nullable: true })
    emailVerificationToken?: string;

    @Column({ type: 'timestamp', nullable: true })
    emailVerificationExpires?: Date;
}
