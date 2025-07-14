import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { StrongPassword } from '../decorators/strongpassword.decorator';

export class RegisterDto {
    @IsString({ message: 'First name must be a string' })
    @IsNotEmpty({ message: 'First name is required' })
    'firstName': string;

    @IsString({ message: 'Last name must be a string' })
    @IsNotEmpty({ message: 'Last name is required' })
    'lastName': string;

    @IsString({ message: 'Username must be a string' })
    @IsNotEmpty({ message: 'Username is required' })
    'username': string;

    @IsEmail({}, { message: 'Invalid email address' })
    @IsNotEmpty({ message: 'Email is required' })
    'email': string;

    @StrongPassword({ message: 'Invalid password format' })
    @IsNotEmpty({ message: 'Password is required' })
    'password': string;

    @IsString({ message: 'Confirm password must be a string' })
    @IsNotEmpty({ message: 'Confirm password is required' })
    'confirmPassword': string;
}
