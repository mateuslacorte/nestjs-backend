// src/modules/board/handlers/board-message.handler.ts
import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { MessageHandler, MessagePayload } from '@common/websocket/interfaces/message-handler.interface';
import { validate } from 'class-validator';
import {WebsocketExampleDto} from "@modules/websocket-example/dtos/websocket-example.dto";
import {WebsocketExampleService} from "@modules/websocket-example/websocket-example.service";

@Injectable()
export class WebsocketExampleHandler implements MessageHandler {
    constructor(private readonly websocketExampleService: WebsocketExampleService) {}

    /**
     * Check if the handler can handle the message
     * @param type - The type of the message
     * @returns True if the handler can handle the message, false otherwise
     */
    canHandle(type: string): boolean {
        return type === 'example';
    }

    /**
     * Handle the message
     * @param client - The client that sent the message
     * @param payload - The payload of the message
     */
    async handle(client: Socket, payload: MessagePayload): Promise<void> {
        let dto;

        dto = Object.assign(new WebsocketExampleDto(), payload);

        const errors = await validate(dto);
        if (errors.length > 0) {
            client.emit('error', { message: 'Validation failed', errors });
            return;
        }

        this.websocketExampleService.processMessage(client, dto);
    }
}