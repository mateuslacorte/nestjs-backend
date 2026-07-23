import { IsEmail, IsNotEmpty, IsString, IsBoolean, IsOptional, IsArray, IsEnum, ValidateIf } from 'class-validator';
import { StrongPassword } from '../../auth/decorators/strongpassword.decorator';
import { InputType, Field } from '@nestjs/graphql';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../auth/enums/role.enum';

@InputType()
export class CreateUserDto {
  @ApiProperty({ example: 'Jane', description: 'User first name' })
  @Field()
  @IsString({message: 'First name must be a string'})
  @IsNotEmpty({message: 'First name is required'})
  firstName!: string;

  @ApiProperty({ example: 'Smith', description: 'User last name' })
  @Field()
  @IsString({message: 'Last name must be a string'})
  @IsNotEmpty({message: 'Last name is required'})
  lastName!: string;

  @ApiProperty({ example: 'janesmith', description: 'Unique username' })
  @Field()
  @IsString({message: 'Username must be a string'})
  @IsNotEmpty({message: 'Username is required'})
  username!: string;

  @ApiProperty({ example: 'jane.smith@example.com', description: 'User email address' })
  @Field()
  @IsEmail({}, {message: 'Invalid email address'})
  @IsNotEmpty({message: 'Email is required'})
  email!: string;

  @ApiPropertyOptional({
    example: 'Str0ng!P@ssword',
    description: 'Password (required unless googleId or facebookId is set)',
  })
  @Field(() => String, { nullable: true })
  @ValidateIf((o: CreateUserDto) => !o.googleId && !o.facebookId)
  @StrongPassword({message: 'Invalid password format'})
  @IsNotEmpty({message: 'Password is required'})
  password?: string;

  @ApiPropertyOptional({
    example: '108234567890123456789',
    description: 'Google subject ID for OAuth users',
  })
  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  googleId?: string;

  @ApiPropertyOptional({
    example: '10234567890123456',
    description: 'Facebook subject ID for OAuth users',
  })
  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  facebookId?: string;

  @ApiPropertyOptional({ example: true, description: 'Whether the user account is active' })
  @Field({ nullable: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: [Role.USER],
    enum: Role,
    isArray: true,
    description: 'Roles assigned to the user',
  })
  @Field(() => [Role], { nullable: true })
  @IsArray()
  @IsEnum(Role, { each: true, message: 'Each role must be a valid Role enum value' })
  @IsOptional()
  roles?: Role[];
}
