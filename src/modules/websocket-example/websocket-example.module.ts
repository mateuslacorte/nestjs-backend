// src/modules/board/board.module.ts
import { Module } from '@nestjs/common';
import { WebsocketModule } from '@common/websocket/websocket.module';
import { WebsocketExampleService } from './websocket-example.service';
import { WebsocketExampleHandler } from './handlers/websocket-example.handler';
import { WebsocketService } from '@common/websocket/websocket.service';
import { WebsocketExampleController } from './websocket-example.controller';

@Module({
    imports: [
        WebsocketModule,
    ],
    controllers: [WebsocketExampleController],
    providers: [
        WebsocketExampleService,
        WebsocketExampleHandler,
        {
            provide: 'REGISTER_HANDLERS',
            useFactory: (websocketService: WebsocketService, websocketExampleHandler: WebsocketExampleHandler) => {
                websocketService.registerMessageHandler(websocketExampleHandler);
                return true;
            },
            inject: [WebsocketService, WebsocketExampleHandler],
        }
    ],
    exports: [WebsocketExampleService],
})
export class WebsocketExampleModule {}