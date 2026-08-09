import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Role } from '@modules/auth/enums/role.enum';
import { IUser } from "@modules/users/interfaces/user.interface";

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

    @Field(() => String, { nullable: true })
    googleId?: string | null;

    @Field(() => String, { nullable: true })
    facebookId?: string | null;

    @Field(() => String, { nullable: true })
    twitterId?: string | null;

    @Field(() => String, { nullable: true })
    githubId?: string | null;

    @Field(() => String, { nullable: true })
    figmaId?: string | null;

    @Field(() => String, { nullable: true })
    linkedinId?: string | null;

    @Field(() => String, { nullable: true })
    slackId?: string | null;

    @Field(() => String, { nullable: true })
    atlassianId?: string | null;

    @Field(() => String, { nullable: true })
    gitlabId?: string | null;

    @Field(() => String, { nullable: true })
    bitbucketId?: string | null;

    @Field(() => String, { nullable: true })
    discordId?: string | null;

    @Field(() => String, { nullable: true })
    twitchId?: string | null;

    @Field(() => String, { nullable: true })
    steamId?: string | null;

    @Field(() => String, { nullable: true })
    redditId?: string | null;

    @Field(() => String, { nullable: true })
    appleId?: string | null;

    @Field(() => String, { nullable: true })
    amazonId?: string | null;

    @Field(() => String, { nullable: true })
    microsoftId?: string | null;

    @Field(() => String, { nullable: true })
    patreonId?: string | null;

    @Field(() => String, { nullable: true })
    dropboxId?: string | null;

    @Field(() => String, { nullable: true })
    coinbaseId?: string | null;

    @Field(() => String, { nullable: true })
    metamaskId?: string | null;

    @Field(() => String, { nullable: true })
    activeDirectoryId?: string | null;

    @Field()
    isActive!: boolean;

    @Field(() => [Role])
    roles!: Role[];

    // These fields are for internal use and not exposed via GraphQL
    passwordResetToken?: string;
    passwordResetExpires?: Date;
    emailVerificationToken?: string;
    emailVerificationExpires?: Date;
}
