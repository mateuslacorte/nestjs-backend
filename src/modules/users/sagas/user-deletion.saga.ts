import { Injectable } from '@nestjs/common';
import { Saga, ICommand, ofType } from '@nestjs/cqrs';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { UserDeletedEvent } from '../events/user-deleted.event';
import { RevokeUserSessionsCommand } from '../commands/revoke-user-sessions.command';

@Injectable()
export class UserDeletionSaga {
  @Saga()
  userDeletion = (events$: Observable<unknown>): Observable<ICommand> => {
    return events$.pipe(
      ofType(UserDeletedEvent) as any,
      map(
        (event: UserDeletedEvent) =>
          new RevokeUserSessionsCommand(event.user.id!, event.operationId),
      ),
    );
  };
}
