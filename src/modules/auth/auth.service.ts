import { Injectable, Inject, BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { RefreshtokenDto } from './dtos/refreshtoken.dto';
import { IUser } from '../users/interfaces/user.interface';

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