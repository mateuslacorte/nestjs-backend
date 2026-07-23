import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { EmailService } from './email.service';
import { ApiTags, ApiResponse, ApiBody, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwtauth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { Role } from '@modules/auth/enums/role.enum';
import { SendEmailDto } from './dtos/send-email.dto';

@ApiTags('Email')
@Controller('email')
export class EmailController {
    constructor(private readonly emailService: EmailService) {}

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.SUPER)
    @ApiBearerAuth('access-token')
    @Post('send')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Send an email',
        description: 'Sends an email via the configured SMTP transport. Requires the super role.',
    })
    @ApiResponse({ status: 200, description: 'Email sent successfully.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions, requires super role.' })
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
