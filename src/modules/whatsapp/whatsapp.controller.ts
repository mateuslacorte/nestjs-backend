import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { ApiTags, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwtauth.guard';
import { SendWhatsappDto } from './dtos/send-whatsapp.dto';

@ApiTags('Whatsapp')
@Controller('whatsapp')
export class WhatsappController {
    constructor(private readonly whatsappService: WhatsappService) {}

    /**
     * Send a WhatsApp message
     * @param sendWhatsappDto - WhatsApp message data
     * @returns The WhatsApp message sent successfully
     */
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    @Post('send')
    @ApiResponse({ status: 200, description: 'WhatsApp message sent successfully.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
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

    /**
     * Send a WhatsApp message
     * @param sendWhatsappDto - WhatsApp message data
     * @returns The WhatsApp message sent successfully
     */
    async sendMessage(@Body() sendWhatsappDto: SendWhatsappDto) {
        await this.whatsappService.sendMessage(
            sendWhatsappDto.to,
            sendWhatsappDto.message
        );
        return { message: 'WhatsApp message sent successfully' };
    }
}