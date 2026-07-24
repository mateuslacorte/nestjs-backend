import { Role } from '@modules/auth/enums/role.enum';

export interface IUser {
    id?: string;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    /** Null for OAuth-only users without a local password */
    password: string | null;
    isActive: boolean;
    roles: Role[];
    googleId?: string | null;
    facebookId?: string | null;
    twitterId?: string | null;
    passwordResetToken?: string;
    passwordResetExpires?: Date;
    emailVerificationToken?: string;
    emailVerificationExpires?: Date;
}
