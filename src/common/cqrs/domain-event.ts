import { IEvent } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';

export abstract class DomainEvent implements IEvent {
  readonly eventId: string;
  readonly occurredAt: Date;

  constructor(
    public readonly operationId: string,
    public readonly actorId?: string,
  ) {
    this.eventId = randomUUID();
    this.occurredAt = new Date();
  }

  abstract get eventName(): string;
}
