import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ExchangeCodeDto {
    @ApiProperty({
        example: 'dGhpcyBpcyBhbiBleGNoYW5nZSBjb2Rl',
        description: 'One-time exchange code received after Google OAuth redirect',
    })
    @IsString()
    @IsNotEmpty()
    code!: string;
}
