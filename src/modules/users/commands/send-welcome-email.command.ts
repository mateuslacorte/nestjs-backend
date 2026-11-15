import { ICommand } from '@nestjs/cqrs';

export class SendWelcomeEmailCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly operationId: string,
  ) {}
}
