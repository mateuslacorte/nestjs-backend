import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { WebsocketExampleDto } from "@modules/websocket-example/dtos/websocket-example.dto";

interface ClientAckInfo {
    clientId: string;
    message: string;
    lastAckTime: Date;
}

@Injectable()
export class WebsocketExampleService {
    private clientAcks: Map<string, ClientAckInfo> = new Map();

    /**
     * Process the message
     * @param client - The client that sent the message
     * @param payload - The payload of the message
     */
    processMessage(client: Socket, payload: WebsocketExampleDto): void {
        console.log(`Processing websocket example message from ${payload.message}`);

        this.updateClientAck(client.id, payload.message);

        client.emit('websocket_example_ack', { received: true, timestamp: new Date().toISOString() });
    }

    /**
     * Update the client ack
     * @param clientId - The ID of the client
     * @param message - The message to update
     */
    private updateClientAck(clientId: string, message: string): void {
        this.clientAcks.set(clientId, {
            clientId,
            message,
            lastAckTime: new Date()
        });

        this.cleanupOldRecords();
    }

    /**
     * Cleanup old records
     */
    private cleanupOldRecords(): void {
        const now = new Date();
        for (const [clientId, info] of this.clientAcks.entries()) {
            const ageInMs = now.getTime() - info.lastAckTime.getTime();
            if (ageInMs > 10000) {
                this.clientAcks.delete(clientId);
            }
        }
    }

    /**
     * Get the recently active clients
     * @returns The recently active clients
     */
    getRecentlyActiveClients(): ClientAckInfo[] {
        const now = new Date();
        const recentClients: ClientAckInfo[] = [];

        for (const info of this.clientAcks.values()) {
            const ageInMs = now.getTime() - info.lastAckTime.getTime();
            if (ageInMs <= 5000) {
                recentClients.push(info);
            }
        }

        return recentClients;
    }

    /**
     * Get all client acks
     * @returns All client acks
     */
    getAllClientAcks(): ClientAckInfo[] {
        return Array.from(this.clientAcks.values());
    }
}