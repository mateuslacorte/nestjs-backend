import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OperationStatusService, OperationStatus } from './operation-status.service';

@ApiTags('Operations')
@ApiBearerAuth('access-token')
@Controller('operations')
export class OperationsController {
  constructor(private readonly opStatus: OperationStatusService) {}

  @Get(':id')
  @ApiOperation({
    summary: 'Poll async operation status',
    description:
      'Returns the current status of an async write operation. ' +
      'Poll until `status` is `completed` or `failed`. ' +
      'Entries expire 24 h after completion.',
  })
  @ApiParam({ name: 'id', description: 'operationId returned by the write endpoint' })
  @ApiResponse({ status: 200, description: 'Operation found — status: pending | completed | failed' })
  @ApiResponse({ status: 404, description: 'Operation not found or expired' })
  get(@Param('id') id: string): Promise<OperationStatus> {
    return this.opStatus.get(id);
  }
}
