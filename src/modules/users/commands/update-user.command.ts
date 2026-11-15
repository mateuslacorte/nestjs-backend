import { ICommand } from '@nestjs/cqrs';
import { UpdateUserDto } from '../dtos/update-user.dto';

export class UpdateUserCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly dto: UpdateUserDto,
    public readonly operationId: string,
    public readonly actorId?: string,
  ) {}
}
