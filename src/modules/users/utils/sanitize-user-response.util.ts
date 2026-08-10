import { IUser } from '../interfaces/user.interface';

/** OAuth / wallet / AD linkage fields — internal only, never returned in API responses. */
export const USER_PROVIDER_ID_FIELDS = [
    'googleId',
    'facebookId',
    'twitterId',
    'githubId',
    'figmaId',
    'linkedinId',
    'slackId',
    'atlassianId',
    'gitlabId',
    'bitbucketId',
    'discordId',
    'twitchId',
    'steamId',
    'redditId',
    'appleId',
    'amazonId',
    'patreonId',
    'dropboxId',
    'metamaskId',
    'activeDirectoryId',
] as const;

export type PublicUser = Pick<
    IUser,
    | 'id'
    | 'username'
    | 'firstName'
    | 'lastName'
    | 'email'
    | 'isActive'
    | 'roles'
>;

/**
 * Strip credentials, reset/verify tokens, and provider linkage IDs from a user
 * before returning it in auth or user GET responses.
 */
export function sanitizeUserForResponse(user: IUser): PublicUser {
    const {
        password: _password,
        passwordResetToken: _passwordResetToken,
        passwordResetExpires: _passwordResetExpires,
        emailVerificationToken: _emailVerificationToken,
        emailVerificationExpires: _emailVerificationExpires,
        googleId: _googleId,
        facebookId: _facebookId,
        twitterId: _twitterId,
        githubId: _githubId,
        figmaId: _figmaId,
        linkedinId: _linkedinId,
        slackId: _slackId,
        atlassianId: _atlassianId,
        gitlabId: _gitlabId,
        bitbucketId: _bitbucketId,
        discordId: _discordId,
        twitchId: _twitchId,
        steamId: _steamId,
        redditId: _redditId,
        appleId: _appleId,
        amazonId: _amazonId,
        patreonId: _patreonId,
        dropboxId: _dropboxId,
        metamaskId: _metamaskId,
        activeDirectoryId: _activeDirectoryId,
        ...publicUser
    } = user;

    return publicUser;
}
