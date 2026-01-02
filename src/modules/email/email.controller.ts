import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { EmailService } from './email.service';
import { ApiTags, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwtauth.guard';
import { SendEmailDto } from './dtos/send-email.dto';

@ApiTags('Email')
@Controller('email')
export class EmailController {
    constructor(private readonly emailService: EmailService) {}

    // Generic email sending endpoint (protected)
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    @Post('send')
    @ApiResponse({ status: 200, description: 'Email sent successfully.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiBody({
        type: SendEmailDto,
        description: 'Email data',
        examples: {
            emailExample: {
                summary: 'Send Email Example',
                description: 'A sample email sending request',
                value: {
                    to: 'recipient@example.com',
                    subject: 'Test Email',
                    html: '<h1>Hello</h1><p>This is a test email</p>'
                }
            }
        }
    })
    async sendEmail(@Body() sendEmailDto: SendEmailDto) {
        await this.emailService.sendMail({
            to: sendEmailDto.to,
            subject: sendEmailDto.subject,
            html: sendEmailDto.html
        });
        return { message: 'Email sent successfully' };
    }
}