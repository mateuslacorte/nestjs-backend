import {
  IUser,
  SearchUsersQuery,
  UsersPage,
} from "@modules/users/interfaces/user.interface";
import {UserPostgresRepository} from "@modules/users/repositories/postgres.repository";
import {Injectable} from "@nestjs/common";
import { Role } from "@modules/auth/enums/role.enum";
import { CreateUserDto } from "./dtos/create-user.dto";
import { UpdateUserDto } from "./dtos/update-user.dto";
import { CacheTTL, EnableCache, NoCache } from "@common/cache/decorators/cache.decorator";
import { decodeUserCursor, encodeUserCursor } from "./utils/cursor.util";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

@Injectable()
export class UsersService {
  constructor(
      private readonly postgresRepo: UserPostgresRepository
  ) {}

  /**
   * Create a new user
   * @param userData - User data to create
   * @returns The created user
   */
  @EnableCache()
  @CacheTTL(1800)
  async create(userData: CreateUserDto): Promise<IUser> {
    return this.postgresRepo.create(userData, true);
  }

  /**
   * Search users with cursor pagination
   */
  @NoCache()
  async search(query: SearchUsersQuery = {}): Promise<UsersPage> {
    const limit = Math.min(
      Math.max(query.limit ?? DEFAULT_PAGE_SIZE, 1),
      MAX_PAGE_SIZE,
    );

    let cursorCreatedAt: Date | undefined;
    let cursorId: string | undefined;
    if (query.cursor) {
      const decoded = decodeUserCursor(query.cursor);
      cursorCreatedAt = decoded.createdAt;
      cursorId = decoded.id;
    }

    const rows = await this.postgresRepo.search({
      limit: limit + 1,
      cursorCreatedAt,
      cursorId,
      q: query.q,
      isActive: query.isActive,
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const last = items[items.length - 1];
    const nextCursor =
      hasMore && last?.createdAt && last.id
        ? encodeUserCursor(last.createdAt, last.id)
        : null;

    return { items, nextCursor };
  }

  /**
   * Find a user by ID
   * @param id - User ID
   * @param includePassword - Whether to return the password hash
   * @returns The user or null if not found
   */
  @NoCache()
  async findById(id: string, includePassword = false): Promise<IUser | null> {
    return this.postgresRepo.findById(id, includePassword);
  }

  /**
   * Find a user by email
   * @param email - User's email
   * @param includePassword - Whether to return the password hash
   * @returns The user or null if not found
   */
  @NoCache()
  async findByEmail(email: string, includePassword = false): Promise<IUser | null> {
    return this.postgresRepo.findByEmail(email, includePassword);
  }

  @NoCache()
  async findByUsername(username: string): Promise<IUser | null> {
    return this.postgresRepo.findByUsername(username);
  }

  /**
   * Find a user by Google subject ID
   */
  @NoCache()
  async findByGoogleId(googleId: string, includePassword = false): Promise<IUser | null> {
    return this.postgresRepo.findByGoogleId(googleId, includePassword);
  }

  /**
   * Find a user by Facebook subject ID
   */
  @NoCache()
  async findByFacebookId(facebookId: string, includePassword = false): Promise<IUser | null> {
    return this.postgresRepo.findByFacebookId(facebookId, includePassword);
  }

  /**
   * Find a user by X / Twitter subject ID
   */
  @NoCache()
  async findByTwitterId(twitterId: string, includePassword = false): Promise<IUser | null> {
    return this.postgresRepo.findByTwitterId(twitterId, includePassword);
  }

  /**
   * Find a user by GitHub subject ID
   */
  @NoCache()
  async findByGithubId(githubId: string, includePassword = false): Promise<IUser | null> {
    return this.postgresRepo.findByGithubId(githubId, includePassword);
  }

  /**
   * Find a user by Figma subject ID
   */
  @NoCache()
  async findByFigmaId(figmaId: string, includePassword = false): Promise<IUser | null> {
    return this.postgresRepo.findByFigmaId(figmaId, includePassword);
  }

  /**
   * Find a user by LinkedIn OpenID subject ID
   */
  @NoCache()
  async findByLinkedinId(linkedinId: string, includePassword = false): Promise<IUser | null> {
    return this.postgresRepo.findByLinkedinId(linkedinId, includePassword);
  }

  /**
   * Find a user by Slack OpenID subject ID
   */
  @NoCache()
  async findBySlackId(slackId: string, includePassword = false): Promise<IUser | null> {
    return this.postgresRepo.findBySlackId(slackId, includePassword);
  }

  /**
   * Find a user by Atlassian account ID
   */
  @NoCache()
  async findByAtlassianId(atlassianId: string, includePassword = false): Promise<IUser | null> {
    return this.postgresRepo.findByAtlassianId(atlassianId, includePassword);
  }

  /**
   * Find a user by GitLab user ID
   */
  @NoCache()
  async findByGitlabId(gitlabId: string, includePassword = false): Promise<IUser | null> {
    return this.postgresRepo.findByGitlabId(gitlabId, includePassword);
  }

  /**
   * Find a user by Bitbucket user UUID
   */
  @NoCache()
  async findByBitbucketId(bitbucketId: string, includePassword = false): Promise<IUser | null> {
    return this.postgresRepo.findByBitbucketId(bitbucketId, includePassword);
  }

  /**
   * Find a user by Discord snowflake user ID
   */
  @NoCache()
  async findByDiscordId(discordId: string, includePassword = false): Promise<IUser | null> {
    return this.postgresRepo.findByDiscordId(discordId, includePassword);
  }

  /**
   * Find a user by Twitch user ID
   */
  @NoCache()
  async findByTwitchId(twitchId: string, includePassword = false): Promise<IUser | null> {
    return this.postgresRepo.findByTwitchId(twitchId, includePassword);
  }

  /**
   * Find a user by SteamID64
   */
  @NoCache()
  async findBySteamId(steamId: string, includePassword = false): Promise<IUser | null> {
    return this.postgresRepo.findBySteamId(steamId, includePassword);
  }


  /**
   * Find a user by Amazon user ID
   */
  @NoCache()
  async findByAmazonId(amazonId: string, includePassword = false): Promise<IUser | null> {
    return this.postgresRepo.findByAmazonId(amazonId, includePassword);
  }


  /**
   * Find a user by Patreon user ID
   */
  @NoCache()
  async findByPatreonId(
    patreonId: string,
    includePassword = false,
  ): Promise<IUser | null> {
    return this.postgresRepo.findByPatreonId(patreonId, includePassword);
  }

  /**
   * Find a user by Dropbox account ID
   */
  @NoCache()
  async findByDropboxId(
    dropboxId: string,
    includePassword = false,
  ): Promise<IUser | null> {
    return this.postgresRepo.findByDropboxId(dropboxId, includePassword);
  }

  /**
   * Find a user by MetaMask Ethereum address
   */
  @NoCache()
  async findByMetamaskId(
    metamaskId: string,
    includePassword = false,
  ): Promise<IUser | null> {
    return this.postgresRepo.findByMetamaskId(metamaskId, includePassword);
  }

  /**
   * Find a user by Active Directory objectGUID
   */
  @NoCache()
  async findByActiveDirectoryId(
    activeDirectoryId: string,
    includePassword = false,
  ): Promise<IUser | null> {
    return this.postgresRepo.findByActiveDirectoryId(
      activeDirectoryId,
      includePassword,
    );
  }

  /**
   * Find a user by Apple subject ID
   */
  @NoCache()
  async findByAppleId(appleId: string, includePassword = false): Promise<IUser | null> {
    return this.postgresRepo.findByAppleId(appleId, includePassword);
  }

  /**
   * Find a user by email verification token
   * @param token - User's email verification token
   * @returns The user or null if not found
   */
  @NoCache()
  async findByEmailVerificationToken(token: string): Promise<IUser | null> {
    return this.postgresRepo.findByEmailVerificationToken(token);
  }

  /**
   * Find a user by password reset token
   * @param token - User's password reset token
   * @returns The user or null if not found
   */
  @NoCache()
  async findByPasswordToken(token: string): Promise<IUser | null> {
    return this.postgresRepo.findByPasswordToken(token);
  }

  /**
   * Update a user by ID
   * @param id - User's ID
   * @returns The updated user
   */
  @EnableCache()
  @CacheTTL(1800)
  async update(id: string, updateUserDto: UpdateUserDto): Promise<IUser> {
    return this.postgresRepo.update(id, updateUserDto);
  }

  /**
   * Remove a user by ID
   * @param id
   * @returns The removed user
   */
  @EnableCache()
  @CacheTTL(1800)
  async remove(id: string): Promise<IUser> {
    return this.postgresRepo.remove(id);
  }

  /**
   * Update the user's password reset token and expiration
   * @param userId
   * @param resetData
   */
  async updateResetToken(userId: string | undefined, resetData: {
    passwordResetToken: string | undefined;
    passwordResetExpires: Date | undefined;
  }): Promise<void> {
    await this.postgresRepo.update(userId!, resetData);
  }

  /**
   * Update the user's password
   * @param userId
   * @param passwordData
   */
  async updatePassword(userId: string, passwordData: {
    password: string;
    passwordResetToken: string | undefined;
    passwordResetExpires: Date | undefined;
  }): Promise<void> {
    await this.postgresRepo.update(userId, passwordData, false);
  }

  /**
   * Update user roles
   * @param userId - User's ID
   * @param roles - New roles array
   * @returns The updated user
   */
  async updateRoles(userId: string, roles: Role[]): Promise<IUser> {
    return this.postgresRepo.update(userId, { roles });
  }

  /**
   * Add a role to the user if not already present
   * @param userId - User's ID
   * @param role - Role to add
   * @returns The updated user
   */
  async addRole(userId: string, role: Role): Promise<IUser> {
    const user = await this.postgresRepo.findById(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    if (!user.roles.includes(role)) {
      const newRoles = [...user.roles, role];
      return this.updateRoles(userId, newRoles);
    }
    
    return user;
  }

  /**
   * Remove a role from the user
   * @param userId - User's ID
   * @param role - Role to remove
   * @returns The updated user
   */
  async removeRole(userId: string, role: Role): Promise<IUser> {
    const user = await this.postgresRepo.findById(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    const newRoles = user.roles.filter(r => r !== role);
    return this.updateRoles(userId, newRoles);
  }

  /**
   * Replace one role with another
   * @param userId - User's ID
   * @param oldRole - Role to replace
   * @param newRole - New role
   * @returns The updated user
   */
  async replaceRole(userId: string, oldRole: Role, newRole: Role): Promise<IUser> {
    const user = await this.postgresRepo.findById(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    const newRoles = user.roles.map(r => r === oldRole ? newRole : r);
    const uniqueRoles = [...new Set(newRoles)];
    return this.updateRoles(userId, uniqueRoles);
  }
}
