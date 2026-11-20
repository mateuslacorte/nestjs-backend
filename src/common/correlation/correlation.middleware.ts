import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CorrelationContext } from './correlation-context';

@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void): void {
    const existing = req.headers?.['x-correlation-id'];
    const id =
      typeof existing === 'string' && existing.trim()
        ? existing.trim()
        : randomUUID();

    if (typeof res.setHeader === 'function') {
      res.setHeader('X-Correlation-ID', id);
    } else if (typeof res.header === 'function') {
      res.header('X-Correlation-ID', id);
    }

    CorrelationContext.run(id, next);
  }
}
