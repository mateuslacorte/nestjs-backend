import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { CorrelationMiddleware } from './correlation.middleware';

@Module({
    providers: [CorrelationMiddleware],
    exports: [CorrelationMiddleware],
})
export class CorrelationModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void {
        consumer.apply(CorrelationMiddleware).forRoutes('*');
    }
}
