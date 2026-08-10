import {
    WebSocketGateway as NestWebSocketGateway,
    SubscribeMessage,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { WebsocketService } from './websocket.service';
import { AbstractWebsocketGateway } from './abstract-websocket.gateway';
import { JwtAuthGuard } from '@modules/auth/guards/jwtauth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { UsersService } from '@modules/users/users.service';

@NestWebSocketGateway({
    // CORS: CorsIoAdapter (Engine.IO) + Origin check in AbstractWebsocketGateway
    path: '/ws',
})
@UseGuards(JwtAuthGuard, RolesGuard)
export class WebsocketGateway extends AbstractWebsocketGateway {
    constructor(
        protected readonly websocketService: WebsocketService,
        protected readonly configService: ConfigService,
        protected readonly usersService: UsersService,
    ) {
        super(websocketService, configService, usersService);
    }

    @SubscribeMessage('message')
    handleMessage(client: Socket, payload: any) {
        this.websocketService.processMessage(client, payload);
        return { event: 'messageResponse', data: { received: true } };
    }
}
