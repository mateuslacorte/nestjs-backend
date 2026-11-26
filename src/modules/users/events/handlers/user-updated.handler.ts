import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OnModuleInit } from '@nestjs/common';
import { UserUpdatedEvent } from '../user-updated.event';
import { UserPostgresRepository } from '../../repositories/postgres.repository';
import { DlqService } from '@common/dlq/dlq.service';
import { WS_CHANNEL_DOMAIN } from '@common/websocket/websocket.service';
import { CacheService } from '@common/cache/cache.service';
import { OperationStatusService } from '@common/operations/operation-status.service';
import { OutboxService } from '@common/outbox/outbox.service';

const HANDLER_KEY = 'UserUpdatedEvent:syncToPostgres';

@EventsHandler(UserUpdatedEvent)
export class UserUpdatedHandler implements IEventHandler<UserUpdatedEvent>, OnModuleInit {

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
        const { user, operationId, actorId } = payload as UserUpdatedEvent;
        await this.syncAndNotify(user, operationId, actorId);
        await this.opStatus.complete(operationId, { userId: user.id });
      },
      {
        onPermanentFailure: async (payload: unknown) => {
          const { operationId } = payload as { operationId: string };
          await this.opStatus.fail(operationId, 'Postgres sync failed after max retries');
        },
      },
    );
  }

  async handle(event: UserUpdatedEvent): Promise<void> {
    try {
      await this.syncAndNotify(event.user, event.operationId, event.actorId);
      await this.opStatus.complete(event.operationId, { userId: event.user.id });
    } catch (err) {
      console.error(`Postgres sync failed for user update ${event.user.id}`, err);
      await this.dlq.push(HANDLER_KEY, { user: event.user, operationId: event.operationId, actorId: event.actorId });
    }
  }

  private async syncAndNotify(user: Parameters<typeof this.postgresRepo.upsert>[0], operationId: string, actorId?: string): Promise<void> {
    await this.postgresRepo.upsert(user);
    console.debug(`User update synced to Postgres: ${user.id}`);

    await this.cache.delPattern(`swr:*:users:findById:${user.id}`);

    await this.outbox.publish({
      aggregateType: 'User',
      aggregateId: user.id ?? '',
      eventType: 'user.updated',
      payload: {
        channel: WS_CHANNEL_DOMAIN,
        message: {
          event: 'user.updated',
          operationId,
          targetUserId: actorId,
          payload: { userId: user.id },
        },
      },
    });
  }
}
