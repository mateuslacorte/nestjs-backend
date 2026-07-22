import { Role } from '@modules/auth/enums/role.enum';

export interface IUser {
    id?: string;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    isActive: boolean;
    roles: Role[];
    passwordResetToken?: string;
    passwordResetExpires?: Date;
    emailVerificationToken?: string;
    emailVerificationExpires?: Date;
}
