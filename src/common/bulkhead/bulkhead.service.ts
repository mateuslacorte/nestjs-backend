import { Injectable } from '@nestjs/common';
import { BulkheadRejectedException } from './bulkhead-rejected.exception';

@Injectable()
export class BulkheadService {
  private readonly limit: number;
  private active = 0;

  constructor() {
    const envVal = process.env.BULKHEAD_MAX_CONCURRENT;
    this.limit = envVal ? parseInt(envVal, 10) : 50;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.limit) {
      throw new BulkheadRejectedException();
    }
    this.active++;
    try {
      return await fn();
    } finally {
      this.active--;
    }
  }

  getStats(): { active: number; limit: number } {
    return { active: this.active, limit: this.limit };
  }
}
