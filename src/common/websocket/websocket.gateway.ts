// src/common/websocket/websocket.gateway.ts
import {
    WebSocketGateway as NestWebSocketGateway,
    SubscribeMessage,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { WebsocketService } from './websocket.service';
import { AbstractWebsocketGateway } from './abstract-websocket.gateway';
import { PayloadValidationPipe } from './pipes/payload-validation.pipe';

@NestWebSocketGateway({
    cors: {
        origin: '*',
    },
    path: '/socket',
    port: 3000,
})
export class WebsocketGateway extends AbstractWebsocketGateway {
    constructor(
        protected readonly websocketService: WebsocketService,
        protected readonly configService: ConfigService,
    ) {
        super(websocketService, configService);
    }

    @SubscribeMessage('message')
    handleMessage(
        client: Socket,
        payload: any
    ) {
        console.log(`Received message from ${client.id}`);
        this.websocketService.processMessage(client, payload);
        return { event: 'messageResponse', data: { received: true } };
    }
}
