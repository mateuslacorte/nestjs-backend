import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { JwtAuthGuard } from './guards/jwtauth.guard';
import { Request } from 'express';
import { ApiTags, ApiResponse } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    // Register new user
    @Post('register')
    @ApiResponse({ status: 201, description: 'User successfully registered.' })
    @ApiResponse({ status: 400, description: 'Invalid data.' })
    async register(@Body() createUserDto: RegisterDto) {
        return await this.authService.register(createUserDto);
    }

    // Login user
    @Post('login')
    @ApiResponse({ status: 200, description: 'User successfully logged in.' })
    @ApiResponse({ status: 401, description: 'Invalid credentials.' })
    async login(@Body() loginDto: LoginDto) {
        return await this.authService.login(loginDto);
    }

    // Verify token (Protected route)
    @Post('verify-token')
    @UseGuards(JwtAuthGuard)
    @ApiResponse({ status: 200, description: 'Token is valid.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    verifyToken(@Req() req: Request) {
        // @ts-ignore
        return { message: 'Token is valid', user: req.user };
    }
}
