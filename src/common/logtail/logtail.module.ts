import { Global, Module } from '@nestjs/common';
import { LogtailService } from './logtail.service';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { LogtailExceptionFilter } from './logtail-exception.filter';
import { LogtailInterceptor } from './logtail.interceptor';
import { LogtailLoggerService } from './logtail-logger.service'; // Add this import

@Global()
@Module({
    providers: [
        LogtailService,
        LogtailLoggerService, // Add this line
        {
            provide: APP_FILTER,
            useClass: LogtailExceptionFilter,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: LogtailInterceptor,
        },
    ],
    exports: [LogtailService, LogtailLoggerService], // Add LogtailLoggerService here
})
export class LogtailModule {}