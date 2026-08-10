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
    description: 'Password (required unless googleId, facebookId, twitterId, githubId, figmaId, linkedinId, slackId, atlassianId, gitlabId, bitbucketId, discordId, twitchId, steamId, amazonId, patreonId, dropboxId, metamaskId, activeDirectoryId, or appleId is set)',
  })
  @Field(() => String, { nullable: true })
  @ValidateIf((o: CreateUserDto) => !o.googleId && !o.facebookId && !o.twitterId && !o.githubId && !o.figmaId && !o.linkedinId && !o.slackId && !o.atlassianId && !o.gitlabId && !o.bitbucketId && !o.discordId && !o.twitchId && !o.steamId && !o.amazonId && !o.patreonId && !o.dropboxId && !o.metamaskId && !o.activeDirectoryId && !o.appleId)
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

  @ApiPropertyOptional({
    example: '2244994945',
    description: 'X / Twitter subject ID for OAuth users',
  })
  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  twitterId?: string;

  @ApiPropertyOptional({
    example: '12345678',
    description: 'GitHub subject ID for OAuth users',
  })
  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  githubId?: string;

  @ApiPropertyOptional({
    example: '1234567890123456789',
    description: 'Figma subject ID for OAuth users',
  })
  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  figmaId?: string;

  @ApiPropertyOptional({
    example: 'AbCdEfGhIjKlMnOp',
    description: 'LinkedIn OpenID subject (sub) for OAuth users',
  })
  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  linkedinId?: string;

  @ApiPropertyOptional({
    example: 'U0R7JM',
    description: 'Slack OpenID subject (sub) for OAuth users',
  })
  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  slackId?: string;

  @ApiPropertyOptional({
    example: '112233aa-bb11-cc22-33dd-445566abcabc',
    description: 'Atlassian account_id for OAuth users',
  })
  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  atlassianId?: string;

  @ApiPropertyOptional({
    example: '12345678',
    description: 'GitLab user ID for OAuth users',
  })
  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  gitlabId?: string;

  @ApiPropertyOptional({
    example: '{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}',
    description: 'Bitbucket user UUID for OAuth users',
  })
  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  bitbucketId?: string;

  @ApiPropertyOptional({
    example: '123456789012345678',
    description: 'Discord snowflake user ID for OAuth users',
  })
  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  discordId?: string;

  @ApiPropertyOptional({
    example: '141981764',
    description: 'Twitch user ID for OAuth users',
  })
  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  twitchId?: string;

  @ApiPropertyOptional({
    example: '76561198000000000',
    description: 'SteamID64 for OpenID users',
  })
  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  steamId?: string;


  @ApiPropertyOptional({
    example: 'amzn1.account.abc123',
    description: 'Amazon user ID for OAuth users',
  })
  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  amazonId?: string;

  @ApiPropertyOptional({
    example: 'patreon-user-123',
    description: 'Patreon user ID for OAuth users',
  })
  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  patreonId?: string;

  @ApiPropertyOptional({
    example: 'dbid:AAH4f99T0taONIb-OurWxbNQ6ywGRopQngc',
    description: 'Dropbox account ID for OAuth users',
  })
  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  dropboxId?: string;

  @ApiPropertyOptional({
    example: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
    description: 'Ethereum address (lowercase) for MetaMask SIWE users',
  })
  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  metamaskId?: string;

  @ApiPropertyOptional({
    example: 'a1b2c3d4e5f6789012345678abcdef01',
    description: 'Active Directory objectGUID for LDAP users',
  })
  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  activeDirectoryId?: string;

  @ApiPropertyOptional({
    example: 'apple.sub.001',
    description: 'Apple subject ID (sub from id_token) for OAuth users',
  })
  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  appleId?: string;

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
