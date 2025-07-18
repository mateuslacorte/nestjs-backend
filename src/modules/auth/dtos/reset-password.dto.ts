import { IsString, IsEmail, MinLength, Matches, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
    @ApiProperty({
        example: '123abc456def...',
        description: 'Reset token received via email'
    })
    @IsString()
    @IsNotEmpty()
    token!: string;

    @ApiProperty({
        example: 'NewStr0ng!P@ssword',
        description: 'New password'
    })
    @IsString()
    @MinLength(8)
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
        message: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character'
    })
    password!: string;

    @ApiProperty({
        example: 'NewStr0ng!P@ssword',
        description: 'Confirm new password'
    })
    @IsString()
    @IsNotEmpty()
    confirmPassword!: string;
}