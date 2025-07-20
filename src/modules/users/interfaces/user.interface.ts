export interface IUser {
    id?: string;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    isActive: boolean;
    roles: string[];
    passwordResetToken?: string;
    passwordResetExpires?: Date;
    emailVerificationToken?: string;
    emailVerificationExpires?: Date;
}