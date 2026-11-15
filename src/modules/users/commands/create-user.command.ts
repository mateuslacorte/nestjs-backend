import { ICommand } from '@nestjs/cqrs';
import { CreateUserDto } from '../dtos/create-user.dto';

export class CreateUserCommand implements ICommand {
  constructor(
    public readonly dto: CreateUserDto,
    public readonly operationId: string,
    public readonly actorId?: string,
  ) {}
}
