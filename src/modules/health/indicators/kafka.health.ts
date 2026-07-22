import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { Kafka, KafkaConfig, logLevel, SASLOptions } from 'kafkajs';

@Injectable()
export class KafkaHealthIndicator extends HealthIndicator {
    constructor(private readonly configService: ConfigService) {
        super();
    }

    /**
     * Check if the Kafka is healthy
     * @param key - The key to check
     * @returns The health of the Kafka
     */
    async isHealthy(key: string): Promise<HealthIndicatorResult> {
        const kafkaConfig = this.configService.get<{
            clientId: string;
            brokers: string[];
            ssl: boolean;
            sasl: { mechanism: string; username: string; password: string };
        }>('kafka');

        const options: KafkaConfig = {
            clientId: kafkaConfig?.clientId,
            brokers: kafkaConfig?.brokers ?? [],
            ssl: kafkaConfig?.ssl,
            logLevel: logLevel.NOTHING,
        };

        if (kafkaConfig?.sasl?.username) {
            options.sasl = {
                mechanism: kafkaConfig.sasl.mechanism,
                username: kafkaConfig.sasl.username,
                password: kafkaConfig.sasl.password,
            } as SASLOptions;
        }

        const kafka = new Kafka(options);
        const admin = kafka.admin();

        try {
            await admin.connect();
            await admin.listTopics();
            return this.getStatus(key, true);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Kafka unreachable';
            throw new HealthCheckError('Kafka check failed', this.getStatus(key, false, { message }));
        } finally {
            await admin.disconnect().catch(() => undefined);
        }
    }
}
