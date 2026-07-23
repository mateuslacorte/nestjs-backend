import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { MessageHandler, MessagePayload } from '@common/websocket/interfaces/message-handler.interface';
import { validate } from 'class-validator';
import { WebsocketExampleDto } from '@modules/websocket-example/dtos/websocket-example.dto';
import { WebsocketExampleService } from '@modules/websocket-example/websocket-example.service';
import { Role } from '@modules/auth/enums/role.enum';

@Injectable()
export class WebsocketExampleHandler implements MessageHandler {
    /** Example: only SUPER can use type "example" */
    readonly roles = [Role.SUPER];

    constructor(private readonly websocketExampleService: WebsocketExampleService) {}

    canHandle(type: string): boolean {
        return type === 'example';
    }

    async handle(client: Socket, payload: MessagePayload): Promise<void> {
        const dto = Object.assign(new WebsocketExampleDto(), payload);

        const errors = await validate(dto);
        if (errors.length > 0) {
            client.emit('error', { message: 'Validation failed', errors });
            return;
        }

        this.websocketExampleService.processMessage(client, dto);
    }
}
