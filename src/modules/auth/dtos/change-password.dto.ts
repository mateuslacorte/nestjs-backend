import { IsString, MinLength, Matches, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
    @ApiProperty({
        example: 'CurrentP@ssw0rd',
        description: "User's current password"
    })
    @IsString()
    @IsNotEmpty({ message: 'Current password is required' })
    currentPassword!: string;

    @ApiProperty({
        example: 'NewStr0ng!P@ssword',
        description: 'New password (minimum 8 characters, with uppercase, lowercase, number, and special character)'
    })
    @IsString()
    @MinLength(8, { message: 'New password must be at least 8 characters long' })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
        message: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character'
    })
    newPassword!: string;

    @ApiProperty({
        example: 'NewStr0ng!P@ssword',
        description: 'New password confirmation'
    })
    @IsString()
    @IsNotEmpty({ message: 'Password confirmation is required' })
    confirmNewPassword!: string;
}

