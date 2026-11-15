import { Subject } from 'rxjs';
import { UserDeletionSaga } from './user-deletion.saga';
import { UserDeletedEvent } from '../events/user-deleted.event';
import { RevokeUserSessionsCommand } from '../commands/revoke-user-sessions.command';
import { IUser } from '../interfaces/user.interface';

const makeUser = (overrides: Partial<IUser> = {}): IUser => ({
  id: 'user-1',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  password: null,
  isActive: true,
  roles: [],
  ...overrides,
});

describe('UserDeletionSaga', () => {
  let saga: UserDeletionSaga;

  beforeEach(() => {
    saga = new UserDeletionSaga();
  });

  it('dispatches RevokeUserSessionsCommand when UserDeletedEvent fires', (done) => {
    const events$ = new Subject<unknown>();
    const commands$ = saga.userDeletion(events$.asObservable());

    const user = makeUser();
    const event = new UserDeletedEvent(user, 'op-1', 'actor-1');

    commands$.subscribe((command) => {
      expect(command).toBeInstanceOf(RevokeUserSessionsCommand);
      const cmd = command as RevokeUserSessionsCommand;
      expect(cmd.userId).toBe('user-1');
      expect(cmd.operationId).toBe('op-1');
      done();
    });

    events$.next(event);
  });

  it('filters out events that are not UserDeletedEvent', (done) => {
    const events$ = new Subject<unknown>();
    const commands$ = saga.userDeletion(events$.asObservable());

    let count = 0;
    commands$.subscribe(() => count++);

    events$.next({ type: 'SomeOtherEvent' });
    events$.next({ type: 'UserCreatedEvent' });

    setTimeout(() => {
      expect(count).toBe(0);
      done();
    }, 50);
  });

  it('handles multiple UserDeletedEvents in sequence', (done) => {
    const events$ = new Subject<unknown>();
    const commands$ = saga.userDeletion(events$.asObservable());

    const collected: RevokeUserSessionsCommand[] = [];
    commands$.subscribe((command) => {
      collected.push(command as RevokeUserSessionsCommand);
      if (collected.length === 2) {
        expect(collected[0].userId).toBe('user-1');
        expect(collected[1].userId).toBe('user-2');
        done();
      }
    });

    events$.next(new UserDeletedEvent(makeUser({ id: 'user-1' }), 'op-1'));
    events$.next(new UserDeletedEvent(makeUser({ id: 'user-2' }), 'op-2'));
  });
});
