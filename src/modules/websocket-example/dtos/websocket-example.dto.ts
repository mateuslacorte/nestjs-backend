import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WebsocketExampleDto {
    @ApiProperty({ example: 'example', description: 'Event type identifier' })
    @IsString()
    @IsNotEmpty()
    type: string = 'example';

    @ApiProperty({ example: 'Hello, world!', description: 'Message payload' })
    @IsString()
    @IsNotEmpty()
    message!: string;

    @ApiProperty({ example: '2026-01-01T00:00:00.000Z', description: 'ISO 8601 timestamp' })
    @IsString()
    timestamp: string = new Date().toISOString();
}