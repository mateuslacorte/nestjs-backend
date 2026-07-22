import { registerEnumType } from '@nestjs/graphql';

export enum Role {
    SUPER = 'super',
    ADMIN = 'admin',
    MANAGER = 'manager',
    USER = 'user',
}

registerEnumType(Role, {
    name: 'Role',
    description: 'User roles used for authorization',
});
