import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { hostname } from 'os';

type LogLevel = 'debug' | 'verbose' | 'info' | 'warn' | 'error';

interface GelfMessage {
    version: '1.1';
    host: string;
    short_message: string;
    full_message?: string;
    timestamp: number;
    level: number;
    _facility: string;
    _level_name: LogLevel;
    _context?: string;
    [key: `_${string}`]: unknown;
}

@Injectable()
export class GraylogService implements OnModuleInit, OnModuleDestroy {
    private readonly client: AxiosInstance;
    private readonly enabled: boolean;
    private readonly host: string;
    private readonly facility: string;
    private readonly originalConsole = {
        log: console.log.bind(console),
        info: console.info.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console),
        debug: console.debug.bind(console),
    };

    constructor(private readonly configService: ConfigService) {
        this.enabled = this.configService.get<boolean>('graylog.enabled') ?? true;
        this.host = this.configService.get<string>('graylog.host') || hostname();
        this.facility = this.configService.get<string>('graylog.facility') || 'nestjs';
        this.client = axios.create({
            baseURL: this.configService.get<string>('graylog.endpoint') || 'http://localhost:12201/gelf',
            timeout: this.configService.get<number>('graylog.timeout') || 3000,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    onModuleInit(): void {
        this.overrideConsole();
    }

    onModuleDestroy(): void {
        Object.assign(console, this.originalConsole);
    }

    log(message: unknown, context?: unknown, level: LogLevel = 'info'): void {
        this.send(this.formatArg(message), level, context);
    }

    write(message: unknown, context?: unknown, level: LogLevel = 'info'): void {
        const formattedMessage = this.formatArg(message);
        const localWriter = level === 'error'
            ? this.originalConsole.error
            : level === 'warn'
                ? this.originalConsole.warn
                : level === 'debug'
                    ? this.originalConsole.debug
                    : this.originalConsole.log;

        localWriter(formattedMessage, context);
        this.send(formattedMessage, level, context);
    }

    error(error: Error | string, context?: unknown): void {
        const message = error instanceof Error ? error.message : error;
        this.send(message, 'error', context, error instanceof Error ? error.stack : undefined);
    }

    private send(message: string, level: LogLevel, context?: unknown, fullMessage?: string): void {
        if (!this.enabled) {
            return;
        }

        const safeContext = context === undefined ? undefined : this.safeSerialize(context);
        const payload: GelfMessage = {
            version: '1.1',
            host: this.host,
            short_message: message.slice(0, 250),
            full_message: fullMessage || (message.length > 250 ? message : undefined),
            timestamp: Date.now() / 1000,
            level: this.toSyslogLevel(level),
            _facility: this.facility,
            _level_name: level,
            ...(safeContext === undefined ? {} : { _context: JSON.stringify(safeContext) }),
        };

        if (safeContext && typeof safeContext === 'object' && !Array.isArray(safeContext)) {
            for (const [key, value] of Object.entries(safeContext)) {
                if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                    payload[`_${key.replace(/[^a-zA-Z0-9_.-]/g, '_')}`] = value;
                }
            }
        }

        void this.client.post('', payload).catch((error: unknown) => {
            const reason = error instanceof Error ? error.message : String(error);
            this.originalConsole.error(`[Graylog] Falha ao enviar log: ${reason}`);
        });
    }

    private toSyslogLevel(level: LogLevel): number {
        const levels: Record<LogLevel, number> = {
            error: 3,
            warn: 4,
            info: 6,
            verbose: 7,
            debug: 7,
        };

        return levels[level];
    }

    private safeSerialize(obj: unknown, maxDepth = 5): unknown {
        const seen = new WeakSet<object>();
        const sensitiveFields = ['password', 'token', 'secret', 'authorization', 'cookie', 'cookies'];

        const serialize = (value: unknown, depth: number): unknown => {
            if (depth > maxDepth) return '[Max Depth]';
            if (value === null || value === undefined || typeof value !== 'object') return value;
            if (value instanceof Date) return value.toISOString();
            if (Buffer.isBuffer(value)) return '[Buffer]';
            if (seen.has(value)) return '[Circular]';

            seen.add(value);

            if (Array.isArray(value)) {
                return value.slice(0, 100).map((item) => serialize(item, depth + 1));
            }

            const result: Record<string, unknown> = {};
            for (const [key, nestedValue] of Object.entries(value)) {
                if (sensitiveFields.includes(key.toLowerCase())) {
                    result[key] = '[REDACTED]';
                } else if (typeof nestedValue !== 'function') {
                    result[key] = serialize(nestedValue, depth + 1);
                }
            }

            return result;
        };

        try {
            return serialize(obj, 0);
        } catch {
            return '[Serialization Error]';
        }
    }

    private overrideConsole(): void {
        console.log = (...args: unknown[]) => {
            this.originalConsole.log(...args);
            this.log(args.map((arg) => this.formatArg(arg)).join(' '), { source: 'console.log' });
        };
        console.info = (...args: unknown[]) => {
            this.originalConsole.info(...args);
            this.log(args.map((arg) => this.formatArg(arg)).join(' '), { source: 'console.info' });
        };
        console.warn = (...args: unknown[]) => {
            this.originalConsole.warn(...args);
            this.log(args.map((arg) => this.formatArg(arg)).join(' '), { source: 'console.warn' }, 'warn');
        };
        console.error = (...args: unknown[]) => {
            this.originalConsole.error(...args);
            if (args[0] instanceof Error) {
                this.error(args[0], { source: 'console.error' });
            } else {
                this.log(args.map((arg) => this.formatArg(arg)).join(' '), { source: 'console.error' }, 'error');
            }
        };
        console.debug = (...args: unknown[]) => {
            this.originalConsole.debug(...args);
            this.log(args.map((arg) => this.formatArg(arg)).join(' '), { source: 'console.debug' }, 'debug');
        };
    }

    private formatArg(arg: unknown): string {
        if (arg === null) return 'null';
        if (arg === undefined) return 'undefined';
        if (typeof arg !== 'object') return String(arg);

        try {
            return JSON.stringify(this.safeSerialize(arg));
        } catch {
            return '[Object]';
        }
    }
}
