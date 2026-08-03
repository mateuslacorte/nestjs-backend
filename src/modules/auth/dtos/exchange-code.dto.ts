import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

export class ExchangeCodeDto {
    @ApiProperty({
        example: 'dGhpcyBpcyBhbiBleGNoYW5nZSBjb2Rl',
        description: 'One-time exchange code received after Google OAuth redirect',
    })
    @Transform(({ value }) => {
        if (typeof value !== 'string') {
            return value;
        }
        let code = value.trim();
        if (/%[0-9A-Fa-f]{2}/.test(code)) {
            try {
                code = decodeURIComponent(code);
            } catch {
                // keep raw value when malformed
            }
        }
        return code.split('#')[0]?.trim() ?? '';
    })
    @IsString()
    @IsNotEmpty()
    code!: string;
}
