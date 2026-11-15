import { ICommand } from '@nestjs/cqrs';

export class RevokeUserSessionsCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly operationId: string,
  ) {}
}
