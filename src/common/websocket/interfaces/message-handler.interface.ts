import { Socket } from 'socket.io';
import { Role } from '@modules/auth/enums/role.enum';

export interface MessagePayload {
    type: string;
    [key: string]: any;
}

export interface MessageHandler {
    canHandle(type: string): boolean;
    handle(client: Socket, payload: MessagePayload): void;
    /** When set, the sender must have at least one of these roles */
    roles?: Role[];
}
