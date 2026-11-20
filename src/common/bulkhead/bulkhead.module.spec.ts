import { Test } from '@nestjs/testing';
import { BulkheadModule } from './bulkhead.module';
import { BulkheadService } from './bulkhead.service';

describe('BulkheadModule', () => {
  it('exports BulkheadService', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [BulkheadModule],
    }).compile();

    expect(moduleRef.get(BulkheadService)).toBeInstanceOf(BulkheadService);

    await moduleRef.close();
  });
});
