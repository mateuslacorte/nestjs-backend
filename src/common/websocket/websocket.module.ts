import { Module, DynamicModule } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';
import { WebsocketService } from './websocket.service';
import { MessageHandler } from './interfaces/message-handler.interface';

@Module({
    providers: [WebsocketGateway, WebsocketService],
    exports: [WebsocketService],
})
export class WebsocketModule {
    static forRoot(): DynamicModule {
        return {
            module: WebsocketModule,
            providers: [WebsocketGateway, WebsocketService],
            exports: [WebsocketService],
        };
    }

    static forFeature(messageHandlers: MessageHandler[] = []): DynamicModule {
        return {
            module: WebsocketModule,
            providers: [
                ...messageHandlers.map(handler => ({
                    provide: `MESSAGE_HANDLER_${handler.constructor.name}`,
                    useValue: handler,
                })),
                {
                    provide: 'MESSAGE_HANDLERS',
                    useFactory: (websocketService: WebsocketService, ...handlers: MessageHandler[]) => {
                        handlers.forEach(handler => websocketService.registerMessageHandler(handler));
                        return handlers;
                    },
                    inject: [WebsocketService, ...messageHandlers.map(h => `MESSAGE_HANDLER_${h.constructor.name}`)],
                },
            ],
            exports: [],
        };
    }
}