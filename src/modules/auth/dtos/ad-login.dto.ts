import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdLoginDto {
    @ApiProperty({
        example: 'jdoe',
        description:
            'AD sAMAccountName or userPrincipalName (e.g. jdoe or jdoe@example.com)',
    })
    @IsString({ message: 'Username must be a string' })
    @IsNotEmpty({ message: 'Username is required' })
    username!: string;

    @ApiProperty({ example: 'StrongP@ssw0rd123', description: 'AD password' })
    @IsString({ message: 'Password must be a string' })
    @IsNotEmpty({ message: 'Password is required' })
    password!: string;
}
