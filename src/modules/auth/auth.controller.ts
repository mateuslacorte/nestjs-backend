import {Controller, Post, Body, Req, UseGuards, Get, Query, HttpCode, HttpStatus} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { JwtAuthGuard } from './guards/jwtauth.guard';
import { Request } from 'express';
import {ApiTags, ApiResponse, ApiBody, ApiBearerAuth, ApiOperation} from '@nestjs/swagger';
import { Public } from './decorators/public.decorator';
import {ForgotPasswordDto} from "./dtos/forgot-password.dto";
import {ResetPasswordDto} from "./dtos/reset-password.dto";
import {RefreshtokenDto} from "@modules/auth/dtos/refreshtoken.dto";
import {ChangePasswordDto} from "./dtos/change-password.dto";

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    /**
     * Register a new user
     * @param createUserDto - User data to register
     * @returns The registered user
     */
    @Public()
    @Post('register')
    @ApiResponse({ status: 201, description: 'User successfully registered.' })
    @ApiResponse({ status: 400, description: 'Invalid data.' })
    @ApiResponse({ status: 409, description: 'Conflict - email or username already exists.' })
    @ApiBody({
        type: RegisterDto,
        description: 'User registration data',
        examples: {
            userRegistration: {
                summary: 'User Registration Example',
                description: 'A sample user registration request',
                value: {
                    firstName: "Jane",
                    lastName: "Smith",
                    username: "janesmith",
                    email: "jane.smith@example.com",
                    password: "Str0ng!P@ssword",
                    confirmPassword: "Str0ng!P@ssword",
                }
            }
        }
    })
    async register(@Body() createUserDto: RegisterDto) {
        return await this.authService.register(createUserDto);
    }

    /**
     * Login a user
     * @param loginDto - User data to login
     * @returns The logged in user
     */
    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiResponse({ status: 200, description: 'User successfully logged in.' })
    @ApiResponse({ status: 401, description: 'Invalid credentials.' })
    @ApiBody({
        type: LoginDto,
        description: 'User login credentials',
        examples: {
            userLogin: {
                summary: 'User Login Example',
                description: 'A sample user login request',
                value: {
                    email: 'john.doe@example.com',
                    password: 'StrongP@ssw0rd123'
                }
            }
        }
    })
    async login(@Body() loginDto: LoginDto) {
        return await this.authService.login(loginDto);
    }

    /**
     * Verify a token
     * @param req - Request object
     * @returns The verified token
     */
    @Post('verify-token')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Verify access token',
        description: 'Validates the JWT access token and returns the authenticated user payload'
    })
    @ApiResponse({ status: 200, description: 'Token is valid.' })
    @ApiResponse({ status: 401, description: 'Unauthorized - invalid or expired token.' })
    verifyToken(@Req() req: Request) {
        return { message: 'Token is valid', user: req.user };
    }

    /**
     * Refresh a token
     * @param refreshTokenDto - Token data to refresh
     * @returns The refreshed token
     */
    @Public()
    @Post('refresh-token')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Refresh access token',
        description: 'Use a valid refresh token to generate new access and refresh tokens'
    })
    @ApiResponse({
        status: 200,
        description: 'Tokens refreshed successfully.',
        schema: {
            type: 'object',
            properties: {
                accessToken: {
                    type: 'string',
                    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMzQ1Njc4OTAiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJyb2xlcyI6WyJ1c2VyIl0sImlhdCI6MTYxNjEyMzYwMCwiZXhwIjoxNjE2MTI3MjAwfQ.new_signature_here'
                },
                refreshToken: {
                    type: 'string',
                    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMzQ1Njc4OTAiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJyb2xlcyI6WyJ1c2VyIl0sImlhdCI6MTYxNjEyMzYwMCwiZXhwIjoxNjE2NzI4NDAwfQ.new_refresh_signature_here'
                }
            }
        }
    })
    @ApiResponse({
        status: 401,
        description: 'Invalid refresh token.',
        schema: {
            type: 'object',
            properties: {
                statusCode: {
                    type: 'number',
                    example: 401
                },
                message: {
                    type: 'string',
                    example: 'Invalid refresh token'
                },
                error: {
                    type: 'string',
                    example: 'Unauthorized'
                }
            }
        }
    })
    @ApiBody({
        type: RefreshtokenDto,
        description: 'Refresh token data',
        examples: {
            refreshTokenExample: {
                summary: 'Refresh Token Example',
                description: 'A sample refresh token request',
                value: {
                    refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMzQ1Njc4OTAiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJyb2xlcyI6WyJ1c2VyIl0sImlhdCI6MTYxNjEyMzYwMCwiZXhwIjoxNjE2NzI4NDAwfQ.signature_here'
                }
            }
        }
    })
    async refreshToken(@Body() refreshTokenDto: RefreshtokenDto) {
        return await this.authService.refreshToken(refreshTokenDto);
    }

    /**
     * Forgot a password
     * @param forgotPasswordDto - Password data to forgot
     * @returns The forgot password
     */
    @Public()
    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    @ApiResponse({ status: 200, description: 'Password reset email sent.' })
    @ApiResponse({ status: 404, description: 'User not found.' })
    @ApiBody({ type: ForgotPasswordDto })
    async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
        const resetToken = await this.authService.createPasswordResetToken(forgotPasswordDto.email);
        await this.authService.sendResetTokenEmail(forgotPasswordDto.email, resetToken);
        return { message: 'Password reset instructions sent to your email' };
    }

    /**
     * Reset a password
     * @param resetPasswordDto - Password data to reset
     * @returns The reset password
     */
    @Public()
    @Post('reset-password')
    @HttpCode(HttpStatus.OK)
    @ApiResponse({ status: 200, description: 'Password successfully reset.' })
    @ApiResponse({ status: 400, description: 'Invalid or expired token.' })
    @ApiResponse({ status: 404, description: 'User not found.' })
    @ApiBody({ type: ResetPasswordDto })
    async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
        await this.authService.resetPassword(resetPasswordDto);
        return { message: 'Password reset successfully' };
    }

    /**
     * Change a password
     * @param req - Request object
     * @param changePasswordDto - Password data to change
     * @returns The changed password
     */
    @Post('change-password')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'Change password for logged-in user' })
    @ApiResponse({ status: 200, description: 'Password changed successfully.' })
    @ApiResponse({ status: 400, description: 'Current password is incorrect or passwords do not match.' })
    @ApiResponse({ status: 401, description: 'Unauthorized - user is not logged in.' })
    @ApiBody({
        type: ChangePasswordDto,
        description: 'Password change data',
        examples: {
            changePassword: {
                summary: 'Password change example',
                description: 'Request to change the logged in user\'s password',
                value: {
                    currentPassword: 'CurrentPassword@123',
                    newPassword: 'NewPassword@456',
                    confirmNewPassword: 'NewPassword@456'
                }
            }
        }
    })
    async changePassword(@Req() req: Request, @Body() changePasswordDto: ChangePasswordDto) {
        const user = req.user as any;
        return await this.authService.changePassword(user.id, changePasswordDto);
    }

    /**
     * Verify an email
     * @param token - Token to verify
     * @returns The verified email
     */
    @Public()
    @Get('verify-email')
    @ApiResponse({ status: 200, description: 'Email verified successfully.' })
    @ApiResponse({ status: 400, description: 'Invalid or expired token.' })
    @ApiResponse({ status: 404, description: 'User not found.' })
    async verifyEmail(@Query('token') token: string) {
        const verified = await this.authService.verifyEmail(token);
        if (verified) {
            return { message: 'Email verified successfully. You can now login.' };
        }
    }

    /**
     * Resend a verification email
     * @param email - Email to resend
     * @returns The resend verification email
     */
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiResponse({ status: 200, description: 'Verification email has been resent.' })
    @ApiResponse({ status: 404, description: 'User not found.' })
    @ApiBody({
        type: String,
        description: 'Email address to resend verification',
        examples: {
            resendVerification: {
                summary: 'Resend Verification Email Example',
                description: 'A sample request to resend verification email',
                value: {
                    email: 'john.doe@example.com'
                }
            }
        }
    })
    @Post('resend-verification')
    async resendVerification(@Body('email') email: string) {
        const token = await this.authService.createEmailVerificationToken(email);
        await this.authService.sendEmailVerification(email, token);
        return { message: 'Email verification resent successfully' };
    }
}