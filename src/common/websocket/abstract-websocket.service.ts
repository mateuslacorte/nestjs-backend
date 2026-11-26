import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { MessageHandler, MessagePayload } from './interfaces/message-handler.interface';
import { AuthenticatedSocket } from './abstract-websocket.gateway';

@Injectable()
export abstract class AbstractWebsocketService {
  protected clients: Map<string, Socket> = new Map();
  protected userSockets: Map<string, Set<string>> = new Map();
  protected messageHandlers: MessageHandler[] = [];

  registerMessageHandler(handler: MessageHandler): void {
    this.messageHandlers.push(handler);
    console.debug(`Registered message handler: ${handler.constructor.name}`);
  }

  addClient(client: Socket): void {
    this.clients.set(client.id, client);
    const auth = client as AuthenticatedSocket;
    const userId = auth.userId ?? auth.data?.user?.id;
    if (userId) {
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);
    }
  }

  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      const auth = client as AuthenticatedSocket;
      const userId = auth.userId ?? auth.data?.user?.id;
      if (userId) {
        this.userSockets.get(userId)?.delete(clientId);
        if (this.userSockets.get(userId)?.size === 0) {
          this.userSockets.delete(userId);
        }
      }
    }
    this.clients.delete(clientId);
  }

  getClient(clientId: string): Socket | undefined {
    return this.clients.get(clientId);
  }

  getAllClients(): Map<string, Socket> {
    return this.clients;
  }

  sendToClient(clientId: string, event: string, data: unknown): boolean {
    const client = this.getClient(clientId);
    if (client) {
      client.emit(event, data);
      return true;
    }
    return false;
  }

  sendToUser(userId: string, event: string, data: unknown): number {
    const socketIds = this.userSockets.get(userId);
    if (!socketIds?.size) return 0;
    let sent = 0;
    for (const socketId of socketIds) {
      if (this.sendToClient(socketId, event, data)) sent++;
    }
    return sent;
  }

  broadcast(event: string, data: unknown, except?: string): void {
    this.clients.forEach((client, id) => {
      if (!except || id !== except) {
        client.emit(event, data);
      }
    });
  }

  processMessage(client: Socket, payload: MessagePayload): void {
    const handler = this.messageHandlers.find((h) => h.canHandle(payload.type));

    if (!handler) {
      console.warn(`No handler for message type: ${payload.type}`);
      return;
    }

    if (handler.roles?.length) {
      const authSocket = client as AuthenticatedSocket;
      const userRoles = authSocket.data?.user?.roles ?? authSocket.user?.roles ?? [];
      const allowed = handler.roles.some((role) => userRoles.includes(role));
      if (!allowed) {
        client.emit('error', {
          statusCode: 403,
          message: 'Forbidden - insufficient role',
          requiredRoles: handler.roles,
        });
        return;
      }
    }

    handler.handle(client, payload);
  }
}
