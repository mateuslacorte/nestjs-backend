import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class WebsocketExampleDto {
    @IsString()
    @IsNotEmpty()
    type: string = 'example';

    @IsString()
    @IsNotEmpty()
    message!: string;

    @IsString()
    timestamp: string = new Date().toISOString();
}