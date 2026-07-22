import { Injectable, LoggerService } from '@nestjs/common';
import { GraylogService } from './graylog.service';

@Injectable()
export class GraylogLoggerService implements LoggerService {
    constructor(private readonly graylogService: GraylogService) {}

    log(message: unknown, context?: string): void {
        this.graylogService.write(message, { context }, 'info');
    }

    error(message: unknown, trace?: string, context?: string): void {
        if (message instanceof Error) {
            this.graylogService.write(message.message, { context, trace, stack: message.stack }, 'error');
            return;
        }

        this.graylogService.write(message, { context, trace }, 'error');
    }

    warn(message: unknown, context?: string): void {
        this.graylogService.write(message, { context }, 'warn');
    }

    debug(message: unknown, context?: string): void {
        this.graylogService.write(message, { context }, 'debug');
    }

    verbose(message: unknown, context?: string): void {
        this.graylogService.write(message, { context }, 'verbose');
    }
}
