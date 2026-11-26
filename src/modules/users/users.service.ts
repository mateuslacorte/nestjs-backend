import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';
import { IUser, SearchUsersQuery as SearchUsersQueryParams, UsersPage } from '@modules/users/interfaces/user.interface';
import { UserPostgresRepository } from '@modules/users/repositories/postgres.repository';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { CreateUserCommand } from './commands/create-user.command';
import { UpdateUserCommand } from './commands/update-user.command';
import { DeleteUserCommand } from './commands/delete-user.command';
import { FindUserByIdQuery } from './queries/find-user-by-id.query';
import { SearchUsersQuery } from './queries/search-users.query';
import { BulkheadService } from '@common/bulkhead/bulkhead.service';
import { CacheService } from '@common/cache/cache.service';
import { OutboxService } from '@common/outbox/outbox.service';

export interface AsyncOperationResult {
  operationId: string;
  status: 'pending';
}

@Injectable()
export class UsersService {
  constructor(
    private readonly postgresRepo: UserPostgresRepository,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly bulkhead: BulkheadService,
    private readonly cache: CacheService,
    private readonly outbox: OutboxService,
  ) {}

  async create(userData: CreateUserDto, actorId?: string): Promise<AsyncOperationResult> {
    const operationId = randomUUID();
    await this.bulkhead.execute(() => this.commandBus.execute(new CreateUserCommand(userData, operationId, actorId)));
    return { operationId, status: 'pending' };
  }

  /** For auth/internal flows that need the created user immediately (Mongo write, event still fires async). */
  async createAndAwaitUser(userData: CreateUserDto, actorId?: string): Promise<IUser> {
    const operationId = randomUUID();
    return this.bulkhead.execute(() => this.commandBus.execute(new CreateUserCommand(userData, operationId, actorId)) as Promise<IUser>);
  }

  async search(query: SearchUsersQueryParams = {}): Promise<UsersPage> {
    return this.queryBus.execute(new SearchUsersQuery(query));
  }

  async findById(id: string, includePassword = false): Promise<IUser | null> {
    return this.queryBus.execute(new FindUserByIdQuery(id, includePassword));
  }

  async findByEmail(email: string, includePassword = false): Promise<IUser | null> {
    return this.postgresRepo.findByEmail(email, includePassword);
  }

  async findByUsername(username: string): Promise<IUser | null> {
    return this.postgresRepo.findByUsername(username);
  }

  async findByGoogleId(googleId: string, includePassword = false): Promise<IUser | null> {
    return this.postgresRepo.findByGoogleId(googleId, includePassword);
  }

  async findByFacebookId(facebookId: string, includePassword = false): Promise<IUser | null> {
    return this.postgresRepo.findByFacebookId(facebookId, includePassword);
  }

  async findByTwitterId(twitterId: string, includePassword = false): Promise<IUser | null> {
    return this.postgresRepo.findByTwitterId(twitterId, includePassword);
  }

  async findByGithubId(githubId: string, includePassword = false): Promise<IUser | null> {
    return this.postgresRepo.findByGithubId(githubId, includePassword);
  }

  async findByFigmaId(figmaId: string, includePassword = false): Promise<IUser | null> {
    return this.postgresRepo.findByFigmaId(figmaId, includePassword);
  }

  async findByLinkedinId(linkedinId: string, includePassword = false): Promise<IUser | null> {
    return this.postgresRepo.findByLinkedinId(linkedinId, includePassword);
  }

  async findBySlackId(slackId: string, includePassword = false): Promise<IUser | null> {
    return this.postgresRepo.findBySlackId(slackId, includePassword);
  }

  async findByAtlassianId(atlassianId: string, includePassword = false): Promise<IUser | null> {
    return this.postgresRepo.findByAtlassianId(atlassianId, includePassword);
  }

  async findByGitlabId(gitlabId: string, includePassword = false): Promise<IUser | null> {
    return this.postgresRepo.findByGitlabId(gitlabId, includePassword);
  }

  async findByBitbucketId(bitbucketId: string, includePassword = false): Promise<IUser | null> {
    return this.postgresRepo.findByBitbucketId(bitbucketId, includePassword);
  }

  async findByDiscordId(discordId: string, includePassword = false): Promise<IUser | null> {
    return this.postgresRepo.findByDiscordId(discordId, includePassword);
  }

  async findByTwitchId(twitchId: string, includePassword = false): Promise<IUser | null> {
    return this.postgresRepo.findByTwitchId(twitchId, includePassword);
  }

  async findBySteamId(steamId: string, includePassword = false): Promise<IUser | null> {
    return this.postgresRepo.findBySteamId(steamId, includePassword);
  }

  async findByAmazonId(amazonId: string, includePassword = false): Promise<IUser | null> {
    return this.postgresRepo.findByAmazonId(amazonId, includePassword);
  }

  async findByPatreonId(patreonId: string, includePassword = false): Promise<IUser | null> {
    return this.postgresRepo.findByPatreonId(patreonId, includePassword);
  }

  async findByDropboxId(dropboxId: string, includePassword = false): Promise<IUser | null> {
    return this.postgresRepo.findByDropboxId(dropboxId, includePassword);
  }

  async findByMetamaskId(metamaskId: string, includePassword = false): Promise<IUser | null> {
    return this.postgresRepo.findByMetamaskId(metamaskId, includePassword);
  }

  async findByActiveDirectoryId(activeDirectoryId: string, includePassword = false): Promise<IUser | null> {
    return this.postgresRepo.findByActiveDirectoryId(activeDirectoryId, includePassword);
  }

  async findByAppleId(appleId: string, includePassword = false): Promise<IUser | null> {
    return this.postgresRepo.findByAppleId(appleId, includePassword);
  }

  async findByEmailVerificationToken(token: string): Promise<IUser | null> {
    return this.postgresRepo.findByEmailVerificationToken(token);
  }

  async findByPasswordToken(token: string): Promise<IUser | null> {
    return this.postgresRepo.findByPasswordToken(token);
  }

  async update(id: string, updateUserDto: UpdateUserDto, actorId?: string): Promise<AsyncOperationResult> {
    const operationId = randomUUID();
    await this.bulkhead.execute(() => this.commandBus.execute(new UpdateUserCommand(id, updateUserDto, operationId, actorId)));
    return { operationId, status: 'pending' };
  }

  /** For auth/internal flows that need the updated user immediately (Mongo write, event still fires async). */
  async updateAndAwaitUser(id: string, updateUserDto: Partial<UpdateUserDto>, actorId?: string): Promise<IUser> {
    const operationId = randomUUID();
    return this.bulkhead.execute(() => this.commandBus.execute(new UpdateUserCommand(id, updateUserDto as UpdateUserDto, operationId, actorId)) as Promise<IUser>);
  }

  async remove(id: string, actorId?: string): Promise<AsyncOperationResult> {
    const operationId = randomUUID();
    await this.bulkhead.execute(() => this.commandBus.execute(new DeleteUserCommand(id, operationId, actorId)));
    return { operationId, status: 'pending' };
  }

  async updateResetToken(userId: string | undefined, resetData: {
    passwordResetToken: string | undefined;
    passwordResetExpires: Date | undefined;
  }): Promise<void> {
    if (!userId) {
      throw new Error('Cannot update reset token: userId is required');
    }
    await this.postgresRepo.update(userId, resetData);
    await this.cache.delPattern(`swr:*:users:findById:${userId}`);
    await this.outbox.publish({
      aggregateType: 'User',
      aggregateId: userId,
      eventType: 'user.password_reset_requested',
      payload: { userId },
    });
  }

  async updatePassword(userId: string, passwordData: {
    password: string;
    passwordResetToken: string | undefined;
    passwordResetExpires: Date | undefined;
  }): Promise<void> {
    await this.postgresRepo.update(userId, passwordData, false);
    await this.cache.delPattern(`swr:*:users:findById:${userId}`);
    await this.outbox.publish({
      aggregateType: 'User',
      aggregateId: userId,
      eventType: 'user.password_changed',
      payload: { userId },
    });
  }

}
