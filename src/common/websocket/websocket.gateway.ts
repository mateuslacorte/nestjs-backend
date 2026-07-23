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

@NestWebSocketGateway({
    cors: {
        origin: '*',
    },
    path: '/ws',
    port: 3000,
})
@UseGuards(JwtAuthGuard, RolesGuard)
export class WebsocketGateway extends AbstractWebsocketGateway {
    constructor(
        protected readonly websocketService: WebsocketService,
        protected readonly configService: ConfigService,
    ) {
        super(websocketService, configService);
    }

    @SubscribeMessage('message')
    handleMessage(client: Socket, payload: any) {
        this.websocketService.processMessage(client, payload);
        return { event: 'messageResponse', data: { received: true } };
    }
}
