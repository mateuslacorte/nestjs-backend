import { Global, Module } from '@nestjs/common';
import { LogtailService } from './logtail.service';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { LogtailExceptionFilter } from './logtail-exception.filter';
import { LogtailInterceptor } from './logtail.interceptor';

@Global()
@Module({
    providers: [
        LogtailService,
        {
            provide: APP_FILTER,
            useClass: LogtailExceptionFilter,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: LogtailInterceptor,
        },
    ],
    exports: [LogtailService],
})
export class LogtailModule {}