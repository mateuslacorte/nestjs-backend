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
import { Role } from '@modules/auth/enums/role.enum';
import * as jwt from 'jsonwebtoken';

export type WebsocketUser = {
    id: string;
    email?: string;
    roles: Role[];
};

export type AuthenticatedSocket = Socket & {
    userId?: string;
    user?: WebsocketUser;
    data: Socket['data'] & { user?: WebsocketUser };
};

export abstract class AbstractWebsocketGateway
    implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
    @WebSocketServer()
    server!: Server;

    protected readonly logger = new Logger(AbstractWebsocketGateway.name);

    constructor(
        protected readonly websocketService: AbstractWebsocketService,
        protected readonly configService: ConfigService,
    ) {}

    afterInit(server: Server): void {
        server.use((socket: Socket, next) => {
            try {
                const rawAuth = socket.handshake.headers?.authorization;
                const token =
                    socket.handshake.auth?.token ||
                    (typeof rawAuth === 'string'
                        ? rawAuth.replace(/^Bearer\s+/i, '')
                        : undefined);

                if (!token) {
                    this.logger.warn(
                        `Connection rejected: No token provided for ${socket.id}`,
                    );
                    return next(new Error('Authentication token required'));
                }

                const jwtSecret =
                    this.configService.get<string>('jwt.secret') ||
                    'fallback-secret-key';
                const decoded = jwt.verify(token, jwtSecret) as {
                    id?: string;
                    email?: string;
                    roles?: Role[];
                };

                if (!decoded?.id) {
                    this.logger.warn(
                        `Connection rejected: Invalid token for ${socket.id}`,
                    );
                    return next(new Error('Invalid token'));
                }

                const user: WebsocketUser = {
                    id: decoded.id,
                    email: decoded.email,
                    roles: Array.isArray(decoded.roles) ? decoded.roles : [],
                };

                const authSocket = socket as AuthenticatedSocket;
                authSocket.userId = user.id;
                authSocket.user = user;
                authSocket.data.user = user;

                this.logger.log(
                    `Client authenticated: ${socket.id} (userId: ${user.id})`,
                );
                next();
            } catch (error: any) {
                this.logger.error(
                    `Authentication error for ${socket.id}: ${error.message}`,
                );
                next(new Error('Authentication failed'));
            }
        });
    }

    handleConnection(client: Socket): void {
        const authSocket = client as AuthenticatedSocket;
        const userId = authSocket.userId ?? authSocket.data?.user?.id;
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
        const authSocket = client as AuthenticatedSocket;
        const userId = authSocket.userId ?? authSocket.data?.user?.id;
        this.logger.log(
            `Client disconnected: ${client.id} (userId: ${userId || 'unknown'})`,
        );
        this.websocketService.removeClient(client.id);
        this.afterDisconnection(client);
    }

    protected afterConnection(client: Socket): void {}
    protected afterDisconnection(client: Socket): void {}
}
