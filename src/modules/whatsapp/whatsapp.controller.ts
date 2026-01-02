import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { ApiTags, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwtauth.guard';
import { SendWhatsappDto } from './dtos/send-whatsapp.dto';

@ApiTags('Whatsapp')
@Controller('whatsapp')
export class WhatsappController {
    constructor(private readonly whatsappService: WhatsappService) {}

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    @Post('send')
    @ApiResponse({ status: 200, description: 'WhatsApp message sent successfully.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiBody({
        type: SendWhatsappDto,
        description: 'WhatsApp message data',
        examples: {
            whatsappExample: {
                summary: 'Send WhatsApp Message Example',
                description: 'A sample WhatsApp message sending request',
                value: {
                    to: '11999999999',
                    message: 'Hello, this is a test message'
                }
            }
        }
    })
    async sendMessage(@Body() sendWhatsappDto: SendWhatsappDto) {
        await this.whatsappService.sendMessage(
            sendWhatsappDto.to,
            sendWhatsappDto.message
        );
        return { message: 'WhatsApp message sent successfully' };
    }
}