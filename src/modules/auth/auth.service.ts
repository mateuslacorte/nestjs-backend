import { Injectable, BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { RefreshtokenDto } from './dtos/refreshtoken.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { IUser } from '../users/interfaces/user.interface';
import { randomBytes } from 'crypto';
import {ResetPasswordDto} from "@modules/auth/dtos/reset-password.dto";
import {EmailService} from "@modules/email/email.service";

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly emailService: EmailService,
    ) {}

    /**
     * Register a new user
     * @param registerDto - User registration data
     * @returns The created user and access token
     */
    async register(registerDto: RegisterDto): Promise<any> {
        const { password, confirmPassword, ...userData } = registerDto;

        // Check if passwords match
        if (password !== confirmPassword) {
            throw new BadRequestException('As senhas não coincidem');
        }

        // Check if user with email already exists
        const existingUser = await this.usersService.findByEmail(userData.email);
        if (existingUser) {
            throw new BadRequestException('Já existe um usuário com este e-mail');
        }

        // Create the user with isActive set to false
        const newUser = await this.usersService.create({
            ...userData,
            password: password,
            isActive: false, // Set to false until email is confirmed
            roles: [],
        });

        // Generate email verification token and send confirmation email
        const verificationToken = await this.createEmailVerificationToken(newUser.email);
        await this.sendEmailVerification(newUser.email, verificationToken);

        // Generate tokens
        const tokens = await this.generateTokens(newUser);

        return {
            user: this.sanitizeUser(newUser),
            ...tokens,
            message: 'Registro realizado com sucesso. Por favor, verifique seu e-mail para confirmar sua conta.',
        };
    }

    /**
     * Create an email verification token for the user
     * @param email - User email to create verification token for
     * @returns The verification token
     */
    async createEmailVerificationToken(email: string): Promise<string> {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new NotFoundException('Usuário não encontrado');
        }

        // Generate a random token
        const verificationToken = String(parseInt(randomBytes(4).toString('hex'), 16) % 1000000).padStart(6, '0');

        // Store the token with the user and set expiration (e.g., 24 hours from now)
        const tokenExpiry = new Date(Date.now() + 86400000); // 24 hours

        // Update user with verification token info
        await this.usersService.update(user.id!, {
            emailVerificationToken: verificationToken,
            emailVerificationExpires: tokenExpiry
        });

        // Return the original (unhashed) token to be sent to the user
        return verificationToken;
    }

    /**
     * Send email verification token via email
     * @param email - User email to send verification token to
     * @param token - The verification token to send
     */
    async sendEmailVerification(email: string, token: string): Promise<void> {
        await this.emailService.sendEmailConfirmation(email, token);
    }

    /**
     * Verify user's email using the verification token
     * @param token - The verification token
     * @returns True if email verification was successful
     */
    async verifyEmail(token: string): Promise<boolean> {
        // Find user by token (you'll need to add this method to UsersService)
        const user = await this.usersService.findByEmailVerificationToken(token);
        if (!user) {
            throw new NotFoundException('Invalid verification token');
        }

        // Check if user has a valid verification token
        if (!user.emailVerificationToken || !user.emailVerificationExpires) {
            throw new BadRequestException('Invalid or expired verification token');
        }

        // Check if token is expired
        if (new Date() > new Date(user.emailVerificationExpires)) {
            throw new BadRequestException('Verification token has expired');
        }

        // Verify the token
        const isTokenValid = token === user.emailVerificationToken;
        if (!isTokenValid) {
            throw new BadRequestException('Invalid verification token');
        }

        // Update the user to be active and clear the verification token
        await this.usersService.update(user.id!, {
            isActive: true,
            emailVerificationToken: "",
            emailVerificationExpires: undefined,
        });

        return true;
    }

    /**
     * Authenticate a user and generate tokens
     * @param loginDto - User login credentials
     * @returns The authenticated user and access token
     */
    async login(loginDto: LoginDto): Promise<any> {
        const { email, password } = loginDto;

        // Validate user credentials
        const user = await this.validateUser(email, password);
        if (!user) {
            throw new UnauthorizedException('Credenciais inválidas');
        }

        // Generate tokens
        const tokens = await this.generateTokens(user);

        return {
            user: this.sanitizeUser(user),
            ...tokens,
        };
    }

    /**
     * Validate user by email and password
     * @param email - User email
     * @param password - User password
     * @returns The validated user or null
     */
    async validateUser(email: string, password: string): Promise<IUser | null> {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            return null;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return null;
        }

        // Check if user has verified their email
        if (!user.isActive) {
            throw new UnauthorizedException('Por favor, verifique seu e-mail antes de fazer login');
        }

        return user;
    }

    /**
     * Validate user by ID (used by JWT strategy)
     * @param userId - User ID
     * @returns The validated user or null
     */
    async validateUserById(userId: string): Promise<IUser | null> {
        return this.usersService.findById(userId);
    }

    /**
     * Refresh access token using refresh token
     * @param refreshTokenDto - Refresh token data
     * @returns New access token and refresh token
     */
    async refreshToken(refreshTokenDto: RefreshtokenDto): Promise<any> {
        const { refreshToken } = refreshTokenDto;

        try {
            // Verify the refresh token
            const payload = this.jwtService.verify(refreshToken, {
                secret: this.configService.get<string>('jwt.refreshSecret'),
            });

            const user = await this.usersService.findById(payload.id);
            if (!user) {
                throw new NotFoundException('Usuário não encontrado');
            }

            // Generate new tokens
            const tokens = await this.generateTokens(user);

            return tokens;
        } catch (error) {
            throw new UnauthorizedException('Token de atualização inválido');
        }
    }

    /**
     * Create a password reset token for the user
     * @param email - User email to create reset token for
     * @returns The reset token
     */
    async createPasswordResetToken(email: string): Promise<string> {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new NotFoundException('Usuário não encontrado');
        }

        // Generate a random token
        const resetToken = String(parseInt(randomBytes(4).toString('hex'), 16) % 1000000).padStart(6, '0');

        // Store the token with the user and set expiration (e.g., 1 hour from now)
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

        // Update user with reset token info
        await this.usersService.updateResetToken(user.id, {
            passwordResetToken: resetToken,
            passwordResetExpires: resetTokenExpiry
        });

        // Return the original (unhashed) token to be sent to the user
        return resetToken;
    }

    /**
     * Reset user password using the reset token
     * @param resetPasswordDto - Data for resetting the password
     * @returns True if password reset was successful
     */
    async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<boolean> {
        const { token, password, confirmPassword } = resetPasswordDto;

        // Check if passwords match
        if (password !== confirmPassword) {
            throw new BadRequestException('As senhas não coincidem');
        }

        const user = await this.usersService.findByPasswordToken(token);
        if (!user) {
            throw new NotFoundException('Usuário não encontrado');
        }

        // Check if user has a valid reset token
        if (!user.passwordResetToken || !user.passwordResetExpires) {
            throw new BadRequestException('Token de recuperação inválido ou expirado');
        }

        // Check if token is expired
        if (new Date() > new Date(user.passwordResetExpires)) {
            throw new BadRequestException('Token de recuperação expirado');
        }

        // Verify the token
        const isTokenValid = token === user.passwordResetToken;
        if (!isTokenValid) {
            throw new BadRequestException('Token de recuperação inválido');
        }

        // Update the user's password and clear the reset token
        await this.usersService.updatePassword(user.id!, {
            password: password,
            passwordResetToken: "",
            passwordResetExpires: undefined,
        });

        return true;
    }

    /**
     * Send password reset token via email
     * @param email - User email to send reset token to
     * @param token - The reset token to send
     * @returns The reset token sent to the user
     */
    async sendResetTokenEmail(email: string, token: string) {
        await this.emailService.sendPasswordReset(email, token);
        return token;
    }

    /**
     * Change password for logged-in user
     * @param userId - ID of the logged-in user
     * @param changePasswordDto - Current and new password data
     * @returns Success message
     */
    async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<{ message: string }> {
        const { currentPassword, newPassword, confirmNewPassword } = changePasswordDto;

        // Check if new passwords match
        if (newPassword !== confirmNewPassword) {
            throw new BadRequestException('A nova senha e a confirmação não coincidem');
        }

        // Check if new password is different from current
        if (currentPassword === newPassword) {
            throw new BadRequestException('A nova senha deve ser diferente da senha atual');
        }

        // Find the user
        const user = await this.usersService.findById(userId);
        if (!user) {
            throw new NotFoundException('Usuário não encontrado');
        }

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            throw new BadRequestException('Senha atual incorreta');
        }

        // Update password
        await this.usersService.updatePassword(userId, {
            password: newPassword,
            passwordResetToken: undefined,
            passwordResetExpires: undefined,
        });

        return { message: 'Senha alterada com sucesso' };
    }

    /**
     * Generate access and refresh tokens for a user
     * @param user - User to generate tokens for
     * @returns Access token and refresh token
     */
    private async generateTokens(user: IUser): Promise<{ accessToken: string; refreshToken: string }> {
        const payload = { id: user.id, email: user.email, roles: user.roles };

        // Generate access token
        const accessToken = this.jwtService.sign(payload, {
            secret: this.configService.get<string>('jwt.secret'),
            expiresIn: this.configService.get<string>('jwt.expirationTime'),
        });

        // Generate refresh token
        const refreshToken = this.jwtService.sign(payload, {
            secret: this.configService.get<string>('jwt.refreshSecret'),
            expiresIn: this.configService.get<string>('jwt.refreshExpirationTime'),
        });

        return {
            accessToken,
            refreshToken,
        };
    }

    /**
     * Remove sensitive data from user object
     * @param user - User object to sanitize
     * @returns Sanitized user object
     */
    private sanitizeUser(user: IUser): Partial<IUser> {
        const { password, ...sanitizedUser } = user as any;
        return sanitizedUser;
    }

}