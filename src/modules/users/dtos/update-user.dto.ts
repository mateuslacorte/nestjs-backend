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
    example: '108234567890123456789',
    description: 'Google subject ID for OAuth users',
  })
  @IsString()
  @IsOptional()
  googleId?: string | null;

  @ApiPropertyOptional({
    example: '10234567890123456',
    description: 'Facebook subject ID for OAuth users',
  })
  @IsString()
  @IsOptional()
  facebookId?: string | null;

  @ApiPropertyOptional({
    example: '2244994945',
    description: 'X / Twitter subject ID for OAuth users',
  })
  @IsString()
  @IsOptional()
  twitterId?: string | null;

  @ApiPropertyOptional({
    example: '12345678',
    description: 'GitHub subject ID for OAuth users',
  })
  @IsString()
  @IsOptional()
  githubId?: string | null;

  @ApiPropertyOptional({
    example: '1234567890123456789',
    description: 'Figma subject ID for OAuth users',
  })
  @IsString()
  @IsOptional()
  figmaId?: string | null;

  @ApiPropertyOptional({
    example: 'AbCdEfGhIjKlMnOp',
    description: 'LinkedIn OpenID subject (sub) for OAuth users',
  })
  @IsString()
  @IsOptional()
  linkedinId?: string | null;

  @ApiPropertyOptional({
    example: 'U0R7JM',
    description: 'Slack OpenID subject (sub) for OAuth users',
  })
  @IsString()
  @IsOptional()
  slackId?: string | null;

  @ApiPropertyOptional({
    example: '112233aa-bb11-cc22-33dd-445566abcabc',
    description: 'Atlassian account_id for OAuth users',
  })
  @IsString()
  @IsOptional()
  atlassianId?: string | null;

  @ApiPropertyOptional({
    example: '12345678',
    description: 'GitLab user ID for OAuth users',
  })
  @IsString()
  @IsOptional()
  gitlabId?: string | null;

  @ApiPropertyOptional({
    example: '{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}',
    description: 'Bitbucket user UUID for OAuth users',
  })
  @IsString()
  @IsOptional()
  bitbucketId?: string | null;

  @ApiPropertyOptional({
    example: '123456789012345678',
    description: 'Discord snowflake user ID for OAuth users',
  })
  @IsString()
  @IsOptional()
  discordId?: string | null;

  @ApiPropertyOptional({
    example: '141981764',
    description: 'Twitch user ID for OAuth users',
  })
  @IsString()
  @IsOptional()
  twitchId?: string | null;

  @ApiPropertyOptional({
    example: '76561198000000000',
    description: 'SteamID64 for OpenID users',
  })
  @IsString()
  @IsOptional()
  steamId?: string | null;


  @ApiPropertyOptional({
    example: 'amzn1.account.abc123',
    description: 'Amazon user ID for OAuth users',
  })
  @IsString()
  @IsOptional()
  amazonId?: string | null;

  @ApiPropertyOptional({
    example: 'patreon-user-123',
    description: 'Patreon user ID for OAuth users',
  })
  @IsString()
  @IsOptional()
  patreonId?: string | null;

  @ApiPropertyOptional({
    example: 'dbid:AAH4f99T0taONIb-OurWxbNQ6ywGRopQngc',
    description: 'Dropbox account ID for OAuth users',
  })
  @IsString()
  @IsOptional()
  dropboxId?: string | null;

  @ApiPropertyOptional({
    example: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
    description: 'Ethereum address (lowercase) for MetaMask SIWE users',
  })
  @IsString()
  @IsOptional()
  metamaskId?: string | null;

  @ApiPropertyOptional({
    example: 'a1b2c3d4e5f6789012345678abcdef01',
    description: 'Active Directory objectGUID for LDAP users',
  })
  @IsString()
  @IsOptional()
  activeDirectoryId?: string | null;

  @ApiPropertyOptional({
    example: 'apple.sub.001',
    description: 'Apple subject ID (sub from id_token) for OAuth users',
  })
  @IsString()
  @IsOptional()
  appleId?: string | null;

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
