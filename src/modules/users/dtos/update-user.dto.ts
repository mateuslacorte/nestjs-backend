import { IsEmail, IsString, IsBoolean, IsOptional, IsArray } from 'class-validator';
import { StrongPassword } from '../../auth/decorators/strongpassword.decorator';

export class UpdateUserDto {
  @IsString({ message: 'First name must be a string' })
  @IsOptional()
  firstName?: string;

  @IsString({ message: 'Last name must be a string' })
  @IsOptional()
  lastName?: string;

  @IsString({ message: 'Username must be a string' })
  @IsOptional()
  username?: string;

  @IsEmail({}, { message: 'Invalid email address' })
  @IsOptional()
  email?: string;

  @StrongPassword({ message: 'Invalid password format' })
  @IsOptional()
  password?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @IsOptional()
  roles?: string[];
}