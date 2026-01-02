import {Controller, Post, Body, Req, UseGuards, Get, Query} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { JwtAuthGuard } from './guards/jwtauth.guard';
import { Request } from 'express';
import {ApiTags, ApiResponse, ApiBody, ApiHeaders, ApiBearerAuth, ApiOperation} from '@nestjs/swagger'; // Add ApiBody here
import { Public } from './decorators/public.decorator';
import {ForgotPasswordDto} from "./dtos/forgot-password.dto";
import {ResetPasswordDto} from "./dtos/reset-password.dto";
import {RefreshtokenDto} from "@modules/auth/dtos/refreshtoken.dto";
import {ChangePasswordDto} from "./dtos/change-password.dto";

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
    @Post('refresh-token')
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

    @Public()
    @Post('forgot-password')
    @ApiResponse({ status: 200, description: 'Password reset email sent.' })
    @ApiResponse({ status: 404, description: 'User not found.' })
    @ApiBody({ type: ForgotPasswordDto })
    async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
        const resetToken = await this.authService.createPasswordResetToken(forgotPasswordDto.email);
        await this.authService.sendResetTokenEmail(forgotPasswordDto.email, resetToken);
        return { message: 'Instruções de recuperação de senha enviadas para seu e-mail' };
    }

    @Public()
    @Post('reset-password')
    @ApiResponse({ status: 200, description: 'Password successfully reset.' })
    @ApiResponse({ status: 400, description: 'Invalid or expired token.' })
    @ApiResponse({ status: 404, description: 'User not found.' })
    @ApiBody({ type: ResetPasswordDto })
    async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
        await this.authService.resetPassword(resetPasswordDto);
        return { message: 'Senha redefinida com sucesso' };
    }

    @Post('change-password')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'Change password for logged-in user' })
    @ApiResponse({ status: 200, description: 'Senha alterada com sucesso.' })
    @ApiResponse({ status: 400, description: 'Senha atual incorreta ou senhas não coincidem.' })
    @ApiResponse({ status: 401, description: 'Não autorizado - usuário não está logado.' })
    @ApiBody({
        type: ChangePasswordDto,
        description: 'Dados para alteração de senha',
        examples: {
            changePassword: {
                summary: 'Exemplo de alteração de senha',
                description: 'Requisição para alterar a senha do usuário logado',
                value: {
                    currentPassword: 'SenhaAtual@123',
                    newPassword: 'NovaSenha@456',
                    confirmNewPassword: 'NovaSenha@456'
                }
            }
        }
    })
    async changePassword(@Req() req: Request, @Body() changePasswordDto: ChangePasswordDto) {
        const user = req.user as any;
        return await this.authService.changePassword(user.id, changePasswordDto);
    }

    @Public()
    @Get('verify-email')
    @ApiResponse({ status: 200, description: 'Email verified successfully.' })
    @ApiResponse({ status: 400, description: 'Invalid or expired token.' })
    @ApiResponse({ status: 404, description: 'User not found.' })
    async verifyEmail(@Query('token') token: string) {
        const verified = await this.authService.verifyEmail(token);
        if (verified) {
            return { message: 'E-mail verificado com sucesso. Você já pode fazer login.' };
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
        return { message: 'E-mail de verificação reenviado com sucesso' };
    }
}