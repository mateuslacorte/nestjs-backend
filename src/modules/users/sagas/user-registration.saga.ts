import { Injectable } from '@nestjs/common';
import { Saga, ICommand, ofType } from '@nestjs/cqrs';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { UserCreatedEvent } from '../events/user-created.event';
import { SendWelcomeEmailCommand } from '../commands/send-welcome-email.command';

@Injectable()
export class UserRegistrationSaga {
  @Saga()
  userRegistration = (events$: Observable<unknown>): Observable<ICommand> => {
    return events$.pipe(
      ofType(UserCreatedEvent) as any,
      map(
        (event: UserCreatedEvent) =>
          new SendWelcomeEmailCommand(
            event.user.id!,
            event.user.email,
            event.operationId,
          ),
      ),
    );
  };
}
