import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger, OnModuleInit } from '@nestjs/common';
import { UserDeletedEvent } from '../user-deleted.event';
import { UserPostgresRepository } from '../../repositories/postgres.repository';
import { DlqService } from '@common/dlq/dlq.service';
import { WS_CHANNEL_DOMAIN } from '@common/websocket/websocket.service';
import { CacheService } from '@common/cache/cache.service';
import { IUser } from '../../interfaces/user.interface';
import { OperationStatusService } from '@common/operations/operation-status.service';
import { OutboxService } from '@common/outbox/outbox.service';

const HANDLER_KEY = 'UserDeletedEvent:syncToPostgres';

@EventsHandler(UserDeletedEvent)
export class UserDeletedHandler implements IEventHandler<UserDeletedEvent>, OnModuleInit {
  private readonly logger = new Logger(UserDeletedHandler.name);

  constructor(
    private readonly postgresRepo: UserPostgresRepository,
    private readonly dlq: DlqService,
    private readonly outbox: OutboxService,
    private readonly cache: CacheService,
    private readonly opStatus: OperationStatusService,
  ) {}

  onModuleInit() {
    this.dlq.registerHandler(
      HANDLER_KEY,
      async (payload: unknown) => {
        const { user, operationId, actorId } = payload as { user: IUser; operationId: string; actorId?: string };
        await this.syncAndNotify(user, operationId, actorId);
        await this.opStatus.complete(operationId, { userId: user.id });
      },
      {
        onPermanentFailure: async (payload: unknown) => {
          const { operationId } = payload as { operationId: string };
          await this.opStatus.fail(operationId, 'Postgres delete sync failed after max retries');
        },
      },
    );
  }

  async handle(event: UserDeletedEvent): Promise<void> {
    try {
      await this.syncAndNotify(event.user, event.operationId, event.actorId);
      await this.opStatus.complete(event.operationId, { userId: event.user.id });
    } catch (err) {
      this.logger.error(`Postgres delete sync failed for user ${event.user.id}`, err);
      await this.dlq.push(HANDLER_KEY, { user: event.user, operationId: event.operationId, actorId: event.actorId });
    }
  }

  private async syncAndNotify(user: IUser, operationId: string, actorId?: string): Promise<void> {
    const userId = user.id!;
    try {
      await this.postgresRepo.remove(userId);
    } catch {
      // already deleted; safe to ignore
    }
    this.logger.debug(`User delete synced to Postgres: ${userId}`);

    await this.cache.delPattern(`swr:*:users:findById:${userId}`);

    await this.outbox.publish({
      aggregateType: 'User',
      aggregateId: userId,
      eventType: 'user.deleted',
      payload: {
        channel: WS_CHANNEL_DOMAIN,
        message: {
          event: 'user.deleted',
          operationId,
          targetUserId: actorId,
          payload: { userId },
        },
      },
    });
  }
}
