import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { DeleteUserCommand } from '../delete-user.command';
import { UserMongoRepository } from '../../repositories/mongo.repository';
import { UserDeletedEvent } from '../../events/user-deleted.event';
import { IUser } from '../../interfaces/user.interface';
import { OperationStatusService } from '@common/operations/operation-status.service';

@CommandHandler(DeleteUserCommand)
export class DeleteUserHandler implements ICommandHandler<DeleteUserCommand, IUser> {
  private readonly logger = new Logger(DeleteUserHandler.name);

  constructor(
    private readonly mongoRepo: UserMongoRepository,
    private readonly eventBus: EventBus,
    private readonly opStatus: OperationStatusService,
  ) {}

  async execute(command: DeleteUserCommand): Promise<IUser> {
    await this.opStatus.pending(command.operationId);
    const user = await this.mongoRepo.remove(command.id);
    this.logger.debug(`User deleted from Mongo: ${command.id}`);
    this.eventBus.publish(new UserDeletedEvent(user, command.operationId, command.actorId));
    return user;
  }
}
