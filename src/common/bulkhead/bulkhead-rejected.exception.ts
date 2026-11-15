import { HttpException, HttpStatus } from '@nestjs/common';

export class BulkheadRejectedException extends HttpException {
  constructor() {
    super('Service is at capacity — try again later', HttpStatus.SERVICE_UNAVAILABLE);
  }
}
