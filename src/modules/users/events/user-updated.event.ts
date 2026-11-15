import { DomainEvent } from '@common/cqrs/domain-event';
import { IUser } from '../interfaces/user.interface';

export class UserUpdatedEvent extends DomainEvent {
  readonly eventName = 'user.updated';

  constructor(
    public readonly user: IUser,
    operationId: string,
    actorId?: string,
  ) {
    super(operationId, actorId);
  }
}
