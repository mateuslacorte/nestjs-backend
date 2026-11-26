import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BulkheadRejectedException } from './bulkhead-rejected.exception';
import { Counter, Gauge, register } from 'prom-client';

const BH_REJECTED_METRIC = 'bulkhead_rejections_total';
const BH_ACTIVE_METRIC = 'bulkhead_active_calls';

@Injectable()
export class BulkheadService {
  private readonly limit: number;
  private active = 0;
  private readonly rejectedCounter: Counter<string>;
  private readonly activeGauge: Gauge<string>;

  constructor(private readonly configService: ConfigService) {
    this.limit = this.configService.get<number>('bulkhead.maxConcurrent', 50);

    const existingCounter = register.getSingleMetric(BH_REJECTED_METRIC);
    this.rejectedCounter = existingCounter
      ? (existingCounter as unknown as Counter<string>)
      : new Counter({ name: BH_REJECTED_METRIC, help: 'Total bulkhead-rejected calls', labelNames: [] });

    const existingGauge = register.getSingleMetric(BH_ACTIVE_METRIC);
    this.activeGauge = existingGauge
      ? (existingGauge as unknown as Gauge<string>)
      : new Gauge({ name: BH_ACTIVE_METRIC, help: 'Currently active bulkhead calls', labelNames: [] });
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.limit) {
      this.rejectedCounter.inc();
      throw new BulkheadRejectedException();
    }
    this.active++;
    this.activeGauge.inc();
    try {
      return await fn();
    } finally {
      this.active--;
      this.activeGauge.dec();
    }
  }

  getStats(): { active: number; limit: number } {
    return { active: this.active, limit: this.limit };
  }
}
