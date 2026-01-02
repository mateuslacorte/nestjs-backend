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

    processMessage(client: Socket, payload: WebsocketExampleDto): void {
        console.log(`Processing websocket example message from ${payload.message}`);

        this.updateClientAck(client.id, payload.message);

        client.emit('websocket_example_ack', { received: true, timestamp: new Date().toISOString() });
    }

    private updateClientAck(clientId: string, message: string): void {
        this.clientAcks.set(clientId, {
            clientId,
            message,
            lastAckTime: new Date()
        });

        this.cleanupOldRecords();
    }

    private cleanupOldRecords(): void {
        const now = new Date();
        for (const [clientId, info] of this.clientAcks.entries()) {
            const ageInMs = now.getTime() - info.lastAckTime.getTime();
            if (ageInMs > 10000) {
                this.clientAcks.delete(clientId);
            }
        }
    }

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

    getAllClientAcks(): ClientAckInfo[] {
        return Array.from(this.clientAcks.values());
    }
}