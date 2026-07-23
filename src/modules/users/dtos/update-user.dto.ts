import {IsEmail, IsString, IsBoolean, IsOptional, IsArray, IsDate, IsEnum} from 'class-validator';
import { StrongPassword } from '../../auth/decorators/strongpassword.decorator';
import { InputType, Field } from '@nestjs/graphql';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../auth/enums/role.enum';

@InputType()
export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Jane', description: 'User first name' })
  @Field({ nullable: true })
  @IsString({ message: 'First name must be a string' })
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Smith', description: 'User last name' })
  @Field({ nullable: true })
  @IsString({ message: 'Last name must be a string' })
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ example: 'janesmith', description: 'Unique username' })
  @Field({ nullable: true })
  @IsString({ message: 'Username must be a string' })
  @IsOptional()
  username?: string;

  @ApiPropertyOptional({ example: 'jane.smith@example.com', description: 'User email address' })
  @Field({ nullable: true })
  @IsEmail({}, { message: 'Invalid email address' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    example: 'Str0ng!P@ssword',
    description: 'Password (uppercase, lowercase, number, and special character)',
  })
  @Field({ nullable: true })
  @StrongPassword({ message: 'Invalid password format' })
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({ example: true, description: 'Whether the user account is active' })
  @Field({ nullable: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: [Role.USER, Role.MANAGER],
    enum: Role,
    isArray: true,
    description: 'Roles assigned to the user',
  })
  @Field(() => [Role], { nullable: true })
  @IsArray()
  @IsEnum(Role, { each: true, message: 'Each role must be a valid Role enum value' })
  @IsOptional()
  roles?: Role[];

  @ApiPropertyOptional({
    example: 'abc123def456...',
    description: 'Email verification token (internal/admin use)',
  })
  @IsString({ message: 'E-mail verification token must be a string' })
  @IsOptional()
  emailVerificationToken?: string;

  @ApiPropertyOptional({
    example: '2026-12-31T23:59:59.000Z',
    description: 'Email verification token expiration (internal/admin use)',
  })
  @IsDate({ message: 'E-mail verification expiration must be a date' })
  @IsOptional()
  emailVerificationExpires?: Date;
}
