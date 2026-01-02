// src/modules/board/handlers/board-message.handler.ts
import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { MessageHandler, MessagePayload } from '@common/websocket/interfaces/message-handler.interface';
import { validate } from 'class-validator';
import {PingDto} from "@modules/board/dtos/ping.dto";
import {BoardService} from "@modules/board/board.service";

@Injectable()
export class BoardHandler implements MessageHandler {
    constructor(private readonly boardService: BoardService) {}

    canHandle(type: string): boolean {
        return type === 'example';
    }

    async handle(client: Socket, payload: MessagePayload): Promise<void> {
        // Determine which DTO to use based on additional properties in the payload
        let dto;

        dto = Object.assign(new PingDto(), payload);

        // Validate the DTO
        const errors = await validate(dto);
        if (errors.length > 0) {
            client.emit('error', { message: 'Validation failed', errors });
            return;
        }

        // Process the message based on its type
        this.boardService.processMessage(client, dto);
    }
}