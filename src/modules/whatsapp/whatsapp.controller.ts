import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { ApiTags, ApiResponse, ApiBody, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwtauth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { Role } from '@modules/auth/enums/role.enum';
import { SendWhatsappDto } from './dtos/send-whatsapp.dto';

@ApiTags('Whatsapp')
@Controller('whatsapp')
export class WhatsappController {
    constructor(private readonly whatsappService: WhatsappService) {}

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.SUPER)
    @ApiBearerAuth('access-token')
    @Post('send')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Send a WhatsApp message',
        description: 'Sends a WhatsApp message via Evolution API. Requires the super role.',
    })
    @ApiResponse({ status: 200, description: 'WhatsApp message sent successfully.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions, requires super role.' })
    @ApiResponse({ status: 502, description: 'Evolution API unreachable or returned an error.' })
    @ApiResponse({ status: 503, description: 'WhatsApp Evolution API is not configured.' })
    @ApiBody({
        type: SendWhatsappDto,
        description: 'WhatsApp message data',
        examples: {
            sendExample: {
                summary: 'Send WhatsApp message',
                description: 'Number is sent as-is (no DDI prefix added by the service)',
                value: {
                    to: '5511999999999',
                    message: 'Hello, this is a test message',
                },
            },
        },
    })
    async sendMessage(@Body() sendWhatsappDto: SendWhatsappDto) {
        await this.whatsappService.sendMessage(
            sendWhatsappDto.to,
            sendWhatsappDto.message
        );
        return { message: 'WhatsApp message sent successfully' };
    }
}
