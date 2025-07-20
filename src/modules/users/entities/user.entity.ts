import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
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

    @Column()
    password!: string;

    @Column({ default: true })
    isActive!: boolean;

    @Column('simple-array')
    roles!: string[];

    @Column({ nullable: true })
    passwordResetToken?: string;

    @Column({ type: 'timestamp', nullable: true })
    passwordResetExpires?: Date;

    @Column({ nullable: true })
    emailVerificationToken?: string;

    @Column({ type: 'timestamp', nullable: true })
    emailVerificationExpires?: Date;
}