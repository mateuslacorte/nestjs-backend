import { Injectable, Inject, BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { RefreshtokenDto } from './dtos/refreshtoken.dto';
import { IUser } from '../users/interfaces/user.interface';
import { randomBytes } from 'crypto';
import {ResetPasswordDto} from "@modules/auth/dtos/reset-password.dto";

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        @Inject('BCRYPT_SALT_ROUNDS') private readonly saltRounds: number,
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
            throw new BadRequestException('Passwords do not match');
        }

        // Check if user with email already exists
        const existingUser = await this.usersService.findByEmail(userData.email);
        if (existingUser) {
            throw new BadRequestException('User with this email already exists');
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, this.saltRounds);

        // Create the user
        const newUser = await this.usersService.create({
            ...userData,
            password: hashedPassword,
            isActive: true,
            roles: ['user'],
        });

        // Generate tokens
        const tokens = await this.generateTokens(newUser);

        return {
            user: this.sanitizeUser(newUser),
            ...tokens,
        };
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
            throw new UnauthorizedException('Invalid credentials');
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
                secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
            });

            // Get the user
            const user = await this.usersService.findById(payload.id);
            if (!user) {
                throw new NotFoundException('User not found');
            }

            // Generate new tokens
            const tokens = await this.generateTokens(user);

            return tokens;
        } catch (error) {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    /**
     * Create a password reset token for the user
     * @param email - User email to create reset token for
     * @returns The reset token
     */
    async createPasswordResetToken(email: string): Promise<string> {
        // Find the user
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Generate a random token
        const resetToken = randomBytes(32).toString('hex');

        // Hash the token before storing it (for security)
        const hashedToken = await bcrypt.hash(resetToken, this.saltRounds);

        // Store the token with the user and set expiration (e.g., 1 hour from now)
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

        // Update user with reset token info
        await this.usersService.updateResetToken(user.id, {
            passwordResetToken: hashedToken,
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
            throw new BadRequestException('Passwords do not match');
        }

        // Find the user
        const user = await this.usersService.findByPasswordToken(token);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Check if user has a valid reset token
        if (!user.passwordResetToken || !user.passwordResetExpires) {
            throw new BadRequestException('Invalid or expired reset token');
        }

        // Check if token is expired
        if (new Date() > new Date(user.passwordResetExpires)) {
            throw new BadRequestException('Reset token has expired');
        }

        // Verify the token
        const isTokenValid = await bcrypt.compare(token, user.passwordResetToken);
        if (!isTokenValid) {
            throw new BadRequestException('Invalid reset token');
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(password, this.saltRounds);

        // Update the user's password and clear the reset token
        await this.usersService.updatePassword(user.id!, {
            password: hashedPassword,
            passwordResetToken: undefined,
            passwordResetExpires: undefined,
        });

        return true;
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
            secret: this.configService.get<string>('JWT_SECRET'),
            expiresIn: this.configService.get<string>('JWT_EXPIRATION_TIME') || '1h',
        });

        // Generate refresh token
        const refreshToken = this.jwtService.sign(payload, {
            secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
            expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION_TIME') || '7d',
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