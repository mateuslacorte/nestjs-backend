import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { GraylogExceptionFilter } from './graylog-exception.filter';
import { GraylogLoggerService } from './graylog-logger.service';
import { GraylogInterceptor } from './graylog.interceptor';
import { GraylogService } from './graylog.service';
import { WikiModule } from '../../wiki/wiki.module';

@Global()
@Module({
    imports: [WikiModule],
    providers: [
        GraylogService,
        GraylogLoggerService,
        {
            provide: APP_FILTER,
            useClass: GraylogExceptionFilter,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: GraylogInterceptor,
        },
    ],
    exports: [GraylogService, GraylogLoggerService],
})
export class GraylogModule {}
