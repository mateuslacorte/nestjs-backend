import {IsEmail, IsString, IsBoolean, IsOptional, IsArray, IsDate} from 'class-validator';
import { StrongPassword } from '../../auth/decorators/strongpassword.decorator';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class UpdateUserDto {
  @Field({ nullable: true })
  @IsString({ message: 'First name must be a string' })
  @IsOptional()
  firstName?: string;

  @Field({ nullable: true })
  @IsString({ message: 'Last name must be a string' })
  @IsOptional()
  lastName?: string;

  @Field({ nullable: true })
  @IsString({ message: 'Username must be a string' })
  @IsOptional()
  username?: string;

  @Field({ nullable: true })
  @IsEmail({}, { message: 'Invalid email address' })
  @IsOptional()
  email?: string;

  @Field({ nullable: true })
  @StrongPassword({ message: 'Invalid password format' })
  @IsOptional()
  password?: string;

  @Field({ nullable: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @Field(() => [String], { nullable: true })
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