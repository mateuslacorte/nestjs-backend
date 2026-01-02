import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { MessageHandler, MessagePayload } from './interfaces/message-handler.interface';

@Injectable()
export abstract class AbstractWebsocketService {
    protected clients: Map<string, Socket> = new Map();
    protected messageHandlers: MessageHandler[] = [];

    registerMessageHandler(handler: MessageHandler): void {
        this.messageHandlers.push(handler);
        console.log(`Registered message handler for type: ${handler.constructor.name}`);
    }

    addClient(client: Socket): void {
        this.clients.set(client.id, client);
    }

    removeClient(clientId: string): void {
        this.clients.delete(clientId);
    }

    getClient(clientId: string): Socket | undefined {
        return this.clients.get(clientId);
    }

    getAllClients(): Map<string, Socket> {
        return this.clients;
    }

    sendToClient(clientId: string, event: string, data: any): boolean {
        const client = this.getClient(clientId);
        if (client) {
            client.emit(event, data);
            return true;
        }
        return false;
    }

    broadcast(event: string, data: any, except?: string): void {
        this.clients.forEach((client, id) => {
            if (!except || id !== except) {
                client.emit(event, data);
            }
        });
    }

    processMessage(client: Socket, payload: MessagePayload): void {
        const handler = this.messageHandlers.find(h => h.canHandle(payload.type));

        if (handler) {
            handler.handle(client, payload);
        } else {
            console.warn(`No handler found for message type: ${payload.type}`);
        }
    }
}