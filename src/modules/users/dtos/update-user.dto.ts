import {IsEmail, IsString, IsBoolean, IsOptional, IsArray, IsDate} from 'class-validator';
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

  @IsString({ message: 'E-mail verification token must be a string' })
  @IsOptional()
  emailVerificationToken?: string;

  @IsDate({ message: 'E-mail verification expiration must be a date' })
  @IsOptional()
  emailVerificationExpires?: Date;
}