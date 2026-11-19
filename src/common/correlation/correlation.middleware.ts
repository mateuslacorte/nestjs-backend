import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { CorrelationContext } from './correlation-context';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction): void {
        const correlationId =
            (req.headers[CORRELATION_ID_HEADER] as string | undefined) ?? randomUUID();

        res.setHeader(CORRELATION_ID_HEADER, correlationId);

        CorrelationContext.run(correlationId, next);
    }
}
