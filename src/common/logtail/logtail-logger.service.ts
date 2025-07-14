import { Injectable, LoggerService } from '@nestjs/common';
import { LogtailService } from './logtail.service';

@Injectable()
export class LogtailLoggerService implements LoggerService {
    constructor(private readonly logtailService: LogtailService) {}

    log(message: any, context?: string) {
        console.log(message, context);
        this.logtailService.log(message, { context }, 'info');
    }

    error(message: any, trace?: string, context?: string) {
        console.error(message, trace, context);
        if (message instanceof Error) {
            this.logtailService.error(message, { context, trace });
        } else {
            this.logtailService.log(message, { context, trace }, 'error');
        }
    }

    warn(message: any, context?: string) {
        console.warn(message, context);
        this.logtailService.log(message, { context }, 'warn');
    }

    debug(message: any, context?: string) {
        console.debug(message, context);
        this.logtailService.log(message, { context }, 'debug');
    }

    verbose(message: any, context?: string) {
        console.log(message, context);
        this.logtailService.log(message, { context }, 'verbose');
    }
}