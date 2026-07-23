import { Controller, Get, UseGuards } from '@nestjs/common';
import { WebsocketExampleService } from './websocket-example.service';
import { ApiTags, ApiResponse, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwtauth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { Role } from '@modules/auth/enums/role.enum';

@ApiTags('Websocket Example')
@Controller('websocket-example')
export class WebsocketExampleController {
    constructor(private readonly websocketExampleService: WebsocketExampleService) {}

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.SUPER)
    @ApiBearerAuth('access-token')
    @Get('online')
    @ApiOperation({
        summary: 'List recently active websocket-example clients',
        description: 'Requires JWT and the super role.',
    })
    @ApiResponse({
        status: 200,
        description: 'List of online clients (active in the last 5 seconds)',
    })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - Insufficient permissions, requires super role.',
    })
    getOnlineWebsocketExamples(): {
        clientId: string;
        message: string;
    }[] {
        const activeClients = this.websocketExampleService.getRecentlyActiveClients();

        return activeClients.map((client: any) => ({
            clientId: client.clientId,
            message: client.message,
        }));
    }
}
