import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RevokeUserSessionsCommand } from '../revoke-user-sessions.command';
import { CacheService } from '@common/cache/cache.service';

const SESSION_REVOKE_TTL = 7 * 24 * 60 * 60; // 7 days — matches max refresh token lifetime

@CommandHandler(RevokeUserSessionsCommand)
export class RevokeUserSessionsHandler implements ICommandHandler<RevokeUserSessionsCommand> {

  constructor(private readonly cacheService: CacheService) {}

  async execute(command: RevokeUserSessionsCommand): Promise<void> {
    console.debug(`Revoking all sessions for user ${command.userId}`);
    await this.cacheService.set(
      `auth:user:revoked:${command.userId}`,
      Date.now(),
      SESSION_REVOKE_TTL,
    );
  }
}
