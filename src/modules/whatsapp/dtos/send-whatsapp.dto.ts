import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendWhatsappDto {
    @ApiProperty({
        description: 'Phone number of the recipient (with country code)',
        example: '5511999999999'
    })
    @IsString({ message: 'Phone number must be a string' })
    @IsNotEmpty({ message: 'Phone number is required' })
    @Matches(/^\d+$/, { message: 'Phone number must contain only digits' })
    to!: string;

    @ApiProperty({
        description: 'Message content',
        example: 'Hello, this is a test message'
    })
    @IsString({ message: 'Message must be a string' })
    @IsNotEmpty({ message: 'Message is required' })
    message!: string;
}