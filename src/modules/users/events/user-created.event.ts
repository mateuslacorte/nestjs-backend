import { DomainEvent } from '@common/cqrs/domain-event';
import { IUser } from '../interfaces/user.interface';

export class UserCreatedEvent extends DomainEvent {
  readonly eventName = 'user.created';

  constructor(
    public readonly user: IUser,
    operationId: string,
    actorId?: string,
  ) {
    super(operationId, actorId);
  }
}
