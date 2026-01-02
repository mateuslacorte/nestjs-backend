import { IsEmail, IsNotEmpty, IsString, IsBoolean, IsOptional, IsArray } from 'class-validator';
import { StrongPassword } from '../../auth/decorators/strongpassword.decorator';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateUserDto {
  @Field()
  @IsString({message: 'First name must be a string'})
  @IsNotEmpty({message: 'First name is required'})
  firstName!: string;

  @Field()
  @IsString({message: 'Last name must be a string'})
  @IsNotEmpty({message: 'Last name is required'})
  lastName!: string;

  @Field()
  @IsString({message: 'Username must be a string'})
  @IsNotEmpty({message: 'Username is required'})
  username!: string;

  @Field()
  @IsEmail({}, {message: 'Invalid email address'})
  @IsNotEmpty({message: 'Email is required'})
  email!: string;

  @Field()
  @StrongPassword({message: 'Invalid password format'})
  @IsNotEmpty({message: 'Password is required'})
  password!: string;

  @Field({ nullable: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @Field(() => [String], { nullable: true })
  @IsArray()
  @IsOptional()
  roles?: string[];
}