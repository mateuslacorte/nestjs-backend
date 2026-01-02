import {
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AbstractWebsocketService } from './abstract-websocket.service';
import * as jwt from 'jsonwebtoken';

export abstract class AbstractWebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
    @WebSocketServer()
    server!: Server;

    protected readonly logger = new Logger(AbstractWebsocketGateway.name);

    constructor(
        protected readonly websocketService: AbstractWebsocketService,
        protected readonly configService: ConfigService,
    ) {}

    afterInit(server: Server): void {
        // Middleware para autenticação JWT
        server.use((socket: Socket, next) => {
            try {
                const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
                
                if (!token) {
                    this.logger.warn(`Connection rejected: No token provided for ${socket.id}`);
                    return next(new Error('Authentication token required'));
                }

                // Verificar token JWT
                const jwtSecret = this.configService.get<string>('jwt.secret') || 'fallback-secret-key';
                const decoded = jwt.verify(token, jwtSecret) as any;
                
                if (!decoded || !decoded.id) {
                    this.logger.warn(`Connection rejected: Invalid token for ${socket.id}`);
                    return next(new Error('Invalid token'));
                }

                // Definir userId no socket
                (socket as any).userId = decoded.id;
                this.logger.log(`Client authenticated: ${socket.id} (userId: ${decoded.id})`);
                next();
            } catch (error: any) {
                this.logger.error(`Authentication error for ${socket.id}: ${error.message}`);
                next(new Error('Authentication failed'));
            }
        });
    }

    handleConnection(client: Socket): void {
        const userId = (client as any).userId;
        if (!userId) {
            this.logger.warn(`Connection rejected: No userId for ${client.id}`);
            client.disconnect();
            return;
        }
        
        this.logger.log(`Client connected: ${client.id} (userId: ${userId})`);
        this.websocketService.addClient(client);
        this.afterConnection(client);
    }

    handleDisconnect(client: Socket): void {
        const userId = (client as any).userId;
        this.logger.log(`Client disconnected: ${client.id} (userId: ${userId || 'unknown'})`);
        this.websocketService.removeClient(client.id);
        this.afterDisconnection(client);
    }

    // Hook methods that can be overridden by subclasses
    protected afterConnection(client: Socket): void {}
    protected afterDisconnection(client: Socket): void {}
}