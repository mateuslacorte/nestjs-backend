import { Injectable, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { Server } from 'socket.io';
import { AbstractWebsocketService } from './abstract-websocket.service';
import { RedisPubSubService } from '@common/pubsub/redis-pubsub.service';

export const WS_CHANNEL_DOMAIN = 'pubsub:events:domain';

@Injectable()
export class WebsocketService extends AbstractWebsocketService implements OnModuleInit, OnApplicationShutdown {
  private server?: Server;

  constructor(private readonly pubSub: RedisPubSubService) {
    super();
  }

  setServer(server: Server): void {
    this.server = server;
  }

  async onApplicationShutdown(): Promise<void> {
    this.broadcast('server:shutdown', {});
    if (this.server) {
      await new Promise<void>((resolve) => this.server!.close(() => resolve()));
    }
  }

  async onModuleInit() {
    await this.pubSub.subscribe(WS_CHANNEL_DOMAIN, (msg) => {
      if (msg.targetUserId) {
        const sent = this.sendToUser(msg.targetUserId, msg.event, {
          operationId: msg.operationId,
          ...((msg.payload as object) ?? {}),
        });
        console.debug(`WS push [${msg.event}] → userId=${msg.targetUserId} (${sent} sockets)`);
      } else {
        this.broadcast(msg.event, {
          operationId: msg.operationId,
          ...((msg.payload as object) ?? {}),
        });
      }
    });

    console.log('WebsocketService subscribed to domain events channel');
  }
}
