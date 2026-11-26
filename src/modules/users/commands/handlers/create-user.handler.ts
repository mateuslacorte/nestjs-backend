import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { CreateUserCommand } from '../create-user.command';
import { UserMongoRepository } from '../../repositories/mongo.repository';
import { UserCreatedEvent } from '../../events/user-created.event';
import { IUser } from '../../interfaces/user.interface';
import { OperationStatusService } from '@common/operations/operation-status.service';

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand, IUser> {

  constructor(
    private readonly mongoRepo: UserMongoRepository,
    private readonly eventBus: EventBus,
    private readonly opStatus: OperationStatusService,
  ) {}

  async execute(command: CreateUserCommand): Promise<IUser> {
    await this.opStatus.pending(command.operationId);
    const user = await this.mongoRepo.create(command.dto, false);
    console.debug(`User created in Mongo: ${user.id}`);
    this.eventBus.publish(new UserCreatedEvent(user, command.operationId, command.actorId));
    return user;
  }
}
