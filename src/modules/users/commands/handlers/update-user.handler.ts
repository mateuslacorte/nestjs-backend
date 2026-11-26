import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { UpdateUserCommand } from '../update-user.command';
import { UserMongoRepository } from '../../repositories/mongo.repository';
import { UserUpdatedEvent } from '../../events/user-updated.event';
import { IUser } from '../../interfaces/user.interface';
import { OperationStatusService } from '@common/operations/operation-status.service';

@CommandHandler(UpdateUserCommand)
export class UpdateUserHandler implements ICommandHandler<UpdateUserCommand, IUser> {

  constructor(
    private readonly mongoRepo: UserMongoRepository,
    private readonly eventBus: EventBus,
    private readonly opStatus: OperationStatusService,
  ) {}

  async execute(command: UpdateUserCommand): Promise<IUser> {
    await this.opStatus.pending(command.operationId);
    try {
      const user = await this.mongoRepo.update(command.id, command.dto);
      console.debug(`User updated in Mongo: ${user.id}`);
      this.eventBus.publish(new UserUpdatedEvent(user, command.operationId, command.actorId));
      return user;
    } catch (err) {
      await this.opStatus.fail(command.operationId, (err as Error).message);
      throw err;
    }
  }
}
