import { Socket } from 'socket.io';

export interface MessagePayload {
    type: string;
    [key: string]: any;
}

export interface MessageHandler {
    canHandle(type: string): boolean;
    handle(client: Socket, payload: MessagePayload): void;
}