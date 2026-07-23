import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { StrongPassword } from '../decorators/strongpassword.decorator';

export class RegisterDto {
    @ApiProperty({ example: 'Jane', description: 'User first name' })
    @IsString({ message: 'First name must be a string' })
    @IsNotEmpty({ message: 'First name is required' })
    firstName!: string;

    @ApiProperty({ example: 'Smith', description: 'User last name' })
    @IsString({ message: 'Last name must be a string' })
    @IsNotEmpty({ message: 'Last name is required' })
    lastName!: string;

    @ApiProperty({ example: 'janesmith', description: 'Unique username' })
    @IsString({ message: 'Username must be a string' })
    @IsNotEmpty({ message: 'Username is required' })
    username!: string;

    @ApiProperty({ example: 'jane.smith@example.com', description: 'User email address' })
    @IsEmail({}, { message: 'Invalid email address' })
    @IsNotEmpty({ message: 'Email is required' })
    email!: string;

    @ApiProperty({
        example: 'Str0ng!P@ssword',
        description: 'Password (uppercase, lowercase, number, and special character)',
    })
    @StrongPassword({ message: 'Invalid password format' })
    @IsNotEmpty({ message: 'Password is required' })
    password!: string;

    @ApiProperty({
        example: 'Str0ng!P@ssword',
        description: 'Password confirmation (must match password)',
    })
    @IsString({ message: 'Confirm password must be a string' })
    @IsNotEmpty({ message: 'Confirm password is required' })
    confirmPassword!: string;
}
