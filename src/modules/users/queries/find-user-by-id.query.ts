import { IQuery } from '@nestjs/cqrs';

export class FindUserByIdQuery implements IQuery {
  constructor(
    public readonly id: string,
    public readonly includePassword = false,
    /** Namespace for SWR cache isolation (e.g. tenant ID). Omit for global. */
    public readonly tenantId?: string,
  ) {}
}
