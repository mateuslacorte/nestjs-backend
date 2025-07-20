import {Controller, Post, Body, Req, UseGuards, Get, Query} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { JwtAuthGuard } from './guards/jwtauth.guard';
import { Request } from 'express';
import {ApiTags, ApiResponse, ApiBody, ApiHeaders, ApiBearerAuth} from '@nestjs/swagger'; // Add ApiBody here
import { Public } from './decorators/public.decorator';
import {ForgotPasswordDto} from "./dtos/forgot-password.dto";
import {ResetPasswordDto} from "./dtos/reset-password.dto";

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    // Register new user
    @Public()
    @Post('register')
    @ApiResponse({ status: 201, description: 'User successfully registered.' })
    @ApiResponse({ status: 400, description: 'Invalid data.' })
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

    // Login user
    @Public()
    @Post('login')
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

    // Verify token (Protected route)
    @Post('verify-token')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token') // <- Precisa bater com o nome no main.ts
    @UseGuards(JwtAuthGuard)
    @Post('verify-token')
    verifyToken(@Req() req: Request) {
        return { message: 'Token is valid', user: req.user };
    }

    @Public()
    @Post('forgot-password')
    @ApiResponse({ status: 200, description: 'Password reset email sent.' })
    @ApiResponse({ status: 404, description: 'User not found.' })
    @ApiBody({ type: ForgotPasswordDto })
    async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
        const resetToken = await this.authService.createPasswordResetToken(forgotPasswordDto.email);
        await this.authService.sendResetTokenEmail(forgotPasswordDto.email, resetToken);
        return { message: 'Password reset instructions sent to your email' };
    }

    @Public()
    @Post('reset-password')
    @ApiResponse({ status: 200, description: 'Password successfully reset.' })
    @ApiResponse({ status: 400, description: 'Invalid or expired token.' })
    @ApiResponse({ status: 404, description: 'User not found.' })
    @ApiBody({ type: ResetPasswordDto })
    async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
        await this.authService.resetPassword(resetPasswordDto);
        return { message: 'Password successfully reset' };
    }

    @Public()
    @Get('verify-email')
    @ApiResponse({ status: 200, description: 'Email verified successfully.' })
    @ApiResponse({ status: 400, description: 'Invalid or expired token.' })
    @ApiResponse({ status: 404, description: 'User not found.' })
    async verifyEmail(@Query('token') token: string) {
        const verified = await this.authService.verifyEmail(token);
        if (verified) {
            return { message: 'Email verified successfully. You can now log in.' };
        }
    }

    @Public()
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
        return { message: 'Verification email has been resent' };
    }
}