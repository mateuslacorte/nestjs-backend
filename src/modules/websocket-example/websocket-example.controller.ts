// src/modules/board/board.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { WebsocketExampleService } from './websocket-example.service';
import { ApiTags, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwtauth.guard';

@ApiTags('Websocket Example')
@Controller('websocket-example')
export class WebsocketExampleController {
    constructor(private readonly websocketExampleService: WebsocketExampleService) {}

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    @Get('online')
    @ApiResponse({
        status: 200,
        description: 'List of online boards (active in the last 5 seconds)',
    })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    getOnlineWebsocketExamples(): {
        clientId: string,
        message: string
    }[] {
        const activeClients = this.websocketExampleService.getRecentlyActiveClients();

        return activeClients.map((client: any) => ({
            clientId: client.clientId,
            message: client.message,
        }));
    }
}