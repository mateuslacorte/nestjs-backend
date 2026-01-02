import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logtail } from '@logtail/node';

@Injectable()
export class LogtailService implements OnModuleInit {
    private logtailClient: Logtail;
    private originalConsole: any = {};

    constructor(private configService: ConfigService) {
        const logtailSourceToken = this.configService.get<string>('logtail.sourceToken') || 'your-log';
        this.logtailClient = new Logtail(logtailSourceToken, {
            endpoint: this.configService.get<string>('logtail.endpoint') || 'https://s1469049.eu-nbg-2.betterstackdata.com'
        });
    }

    onModuleInit() {
        this.overrideConsole();
    }

    /**
     * Serializa objeto removendo referências circulares
     */
    private safeSerialize(obj: any, maxDepth: number = 5): any {
        const seen = new WeakSet();
        
        const serialize = (value: any, depth: number): any => {
            // Limite de profundidade
            if (depth > maxDepth) {
                return '[Max Depth]';
            }

            // Valores primitivos
            if (value === null || value === undefined) {
                return value;
            }

            if (typeof value !== 'object') {
                return value;
            }

            // Detectar referência circular
            if (seen.has(value)) {
                return '[Circular]';
            }

            // Arrays
            if (Array.isArray(value)) {
                seen.add(value);
                const result = value.map(item => serialize(item, depth + 1));
                return result;
            }

            // Date
            if (value instanceof Date) {
                return value.toISOString();
            }

            // Buffer
            if (Buffer.isBuffer(value)) {
                return '[Buffer]';
            }

            // Objetos
            seen.add(value);
            const result: any = {};
            
            for (const key of Object.keys(value)) {
                try {
                    // Ignorar campos sensíveis e muito grandes
                    const sensitiveFields = ['password', 'token', 'secret', 'authorization', 'cookie', 'cookies'];
                    if (sensitiveFields.includes(key.toLowerCase())) {
                        result[key] = '[REDACTED]';
                        continue;
                    }

                    const val = value[key];
                    
                    // Ignorar funções
                    if (typeof val === 'function') {
                        continue;
                    }

                    // Ignorar streams e buffers grandes
                    if (val && (val.pipe || val._readableState || val._writableState)) {
                        result[key] = '[Stream]';
                        continue;
                    }

                    result[key] = serialize(val, depth + 1);
                } catch (e) {
                    result[key] = '[Error reading property]';
                }
            }
            
            return result;
        };

        try {
            return serialize(obj, 0);
        } catch (e) {
            return '[Serialization Error]';
        }
    }

    // Method to log messages
    async log(message: string, context?: any, level: string = 'info') {
        const safeContext = context ? this.safeSerialize(context) : undefined;
        await this.logtailClient.info(message, {
            level,
            context: safeContext,
            timestamp: new Date().toISOString(),
        });
    }

    // Method to log errors
    async error(error: Error | string, context?: any) {
        const message = error instanceof Error ? error.message : error;
        const stack = error instanceof Error ? error.stack : undefined;
        const safeContext = context ? this.safeSerialize(context) : undefined;

        await this.logtailClient.error(message, {
            level: 'error',
            context: safeContext,
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
