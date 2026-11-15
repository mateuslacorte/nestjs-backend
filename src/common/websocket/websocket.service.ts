import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AbstractWebsocketService } from './abstract-websocket.service';
import { RedisPubSubService } from '@common/pubsub/redis-pubsub.service';

export const WS_CHANNEL_DOMAIN = 'pubsub:events:domain';

@Injectable()
export class WebsocketService extends AbstractWebsocketService implements OnModuleInit {
  protected readonly logger = new Logger(WebsocketService.name);

  constructor(private readonly pubSub: RedisPubSubService) {
    super();
  }

  async onModuleInit() {
    await this.pubSub.subscribe(WS_CHANNEL_DOMAIN, (msg) => {
      if (msg.targetUserId) {
        const sent = this.sendToUser(msg.targetUserId, msg.event, {
          operationId: msg.operationId,
          ...((msg.payload as object) ?? {}),
        });
        this.logger.debug(`WS push [${msg.event}] → userId=${msg.targetUserId} (${sent} sockets)`);
      } else {
        this.broadcast(msg.event, {
          operationId: msg.operationId,
          ...((msg.payload as object) ?? {}),
        });
      }
    });

    this.logger.log('WebsocketService subscribed to domain events channel');
  }
}
