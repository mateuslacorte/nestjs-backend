import { Field, ID, ObjectType } from '@nestjs/graphql';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@modules/auth/enums/role.enum';
import { IUser } from "@modules/users/interfaces/user.interface";
import { AsyncOperationResult } from '../users.service';

@ObjectType()
export class OperationResultModel implements AsyncOperationResult {
    @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'Unique operation ID to poll for async result' })
    @Field()
    operationId!: string;

    @ApiProperty({ example: 'pending', enum: ['pending'], description: 'Current operation status' })
    @Field()
    status!: 'pending';
}


@ObjectType()
export class UserModel implements IUser {
    @Field(() => ID, { nullable: true })
    id?: string;

    @Field()
    username!: string;

    @Field()
    firstName!: string;

    @Field()
    lastName!: string;

    @Field()
    email!: string;

    // Exclude password from GraphQL responses for security
    password!: string | null;

    // Provider linkage IDs are internal — not exposed via GraphQL
    googleId?: string | null;
    facebookId?: string | null;
    twitterId?: string | null;
    githubId?: string | null;
    figmaId?: string | null;
    linkedinId?: string | null;
    slackId?: string | null;
    atlassianId?: string | null;
    gitlabId?: string | null;
    bitbucketId?: string | null;
    discordId?: string | null;
    twitchId?: string | null;
    steamId?: string | null;
    appleId?: string | null;
    amazonId?: string | null;
    patreonId?: string | null;
    dropboxId?: string | null;
    metamaskId?: string | null;
    activeDirectoryId?: string | null;

    @Field()
    isActive!: boolean;

    @Field(() => [Role])
    roles!: Role[];

    @Field({ nullable: true })
    createdAt?: Date;

    // These fields are for internal use and not exposed via GraphQL
    passwordResetToken?: string;
    passwordResetExpires?: Date;
    emailVerificationToken?: string;
    emailVerificationExpires?: Date;
}

@ObjectType()
export class UsersPageModel {
    @Field(() => [UserModel])
    items!: UserModel[];

    @Field(() => String, { nullable: true })
    nextCursor!: string | null;
}
