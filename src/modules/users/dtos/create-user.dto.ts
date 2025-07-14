import { IsEmail, IsNotEmpty, IsString, IsBoolean, IsOptional, IsArray } from 'class-validator';
import { StrongPassword } from '../../auth/decorators/strongpassword.decorator';

export class CreateUserDto {
  @IsString({message: 'First name must be a string'})
  @IsNotEmpty({message: 'First name is required'})
  firstName!: string;

  @IsString({message: 'Last name must be a string'})
  @IsNotEmpty({message: 'Last name is required'})
  lastName!: string;

  @IsString({message: 'Username must be a string'})
  @IsNotEmpty({message: 'Username is required'})
  username!: string;

  @IsEmail({}, {message: 'Invalid email address'})
  @IsNotEmpty({message: 'Email is required'})
  email!: string;

  @StrongPassword({message: 'Invalid password format'})
  @IsNotEmpty({message: 'Password is required'})
  password!: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @IsOptional()
  roles?: string[];
}