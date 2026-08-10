import { Role } from '@modules/auth/enums/role.enum';

export interface IUser {
    id?: string;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    /** Null for OAuth-only users without a local password */
    password: string | null;
    isActive: boolean;
    roles: Role[];
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
    redditId?: string | null;
    appleId?: string | null;
    amazonId?: string | null;
    patreonId?: string | null;
    dropboxId?: string | null;
    metamaskId?: string | null;
    activeDirectoryId?: string | null;
    passwordResetToken?: string;
    passwordResetExpires?: Date;
    emailVerificationToken?: string;
    emailVerificationExpires?: Date;
}
