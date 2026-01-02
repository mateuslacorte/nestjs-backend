// src/common/websocket/websocket.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { AbstractWebsocketService } from './abstract-websocket.service';

@Injectable()
export class WebsocketService extends AbstractWebsocketService {
    constructor() {
        super();
        console.log('WebSocket service initialized');
    }
}