import { Injectable, OnModuleInit } from '@nestjs/common';
import { Logtail } from '@logtail/node';

@Injectable()
export class LogtailService implements OnModuleInit {
    private logtailClient: Logtail;
    private originalConsole: any = {};

    constructor() {
        const logtailSourceToken = process.env.LOGTAIL_SOURCE_TOKEN || 'your-log';
        this.logtailClient = new Logtail(logtailSourceToken);
    }

    onModuleInit() {
        this.overrideConsole();
    }

    // Method to log messages
    async log(message: string, context?: any, level: string = 'info') {
        await this.logtailClient.info(message, {
            level,
            context,
            timestamp: new Date().toISOString(),
        });
    }

    // Method to log errors
    async error(error: Error | string, context?: any) {
        const message = error instanceof Error ? error.message : error;
        const stack = error instanceof Error ? error.stack : undefined;

        await this.logtailClient.error(message, {
            level: 'error',
            context,
            stack,
            timestamp: new Date().toISOString(),
        });
    }

    // Override console methods
    private overrideConsole() {
        // Store original console methods
        this.originalConsole.log = console.log;
        this.originalConsole.info = console.info;
        this.originalConsole.warn = console.warn;
        this.originalConsole.error = console.error;
        this.originalConsole.debug = console.debug;

        // Override console.log
        console.log = (...args: any[]) => {
            this.originalConsole.log(...args);
            this.log(args.map(arg => this.formatArg(arg)).join(' '), { source: 'console.log' });
        };

        // Override console.info
        console.info = (...args: any[]) => {
            this.originalConsole.info(...args);
            this.log(args.map(arg => this.formatArg(arg)).join(' '), { source: 'console.info' }, 'info');
        };

        // Override console.warn
        console.warn = (...args: any[]) => {
            this.originalConsole.warn(...args);
            this.log(args.map(arg => this.formatArg(arg)).join(' '), { source: 'console.warn' }, 'warn');
        };

        // Override console.error
        console.error = (...args: any[]) => {
            this.originalConsole.error(...args);

            // Check if the first argument is an Error object
            if (args[0] instanceof Error) {
                this.error(args[0], { source: 'console.error' });
            } else {
                this.log(args.map(arg => this.formatArg(arg)).join(' '), { source: 'console.error' }, 'error');
            }
        };

        // Override console.debug
        console.debug = (...args: any[]) => {
            this.originalConsole.debug(...args);
            this.log(args.map(arg => this.formatArg(arg)).join(' '), { source: 'console.debug' }, 'debug');
        };
    }

    // Helper method to format arguments for logging
    private formatArg(arg: any): string {
        if (arg === null) return 'null';
        if (arg === undefined) return 'undefined';
        if (typeof arg === 'object') {
            try {
                return JSON.stringify(arg);
            } catch (e) {
                return '[Object]';
            }
        }
        return String(arg);
    }
}
