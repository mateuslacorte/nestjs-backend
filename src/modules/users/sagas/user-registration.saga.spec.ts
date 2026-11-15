import { Subject } from 'rxjs';
import { UserRegistrationSaga } from './user-registration.saga';
import { UserCreatedEvent } from '../events/user-created.event';
import { SendWelcomeEmailCommand } from '../commands/send-welcome-email.command';
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

describe('UserRegistrationSaga', () => {
  let saga: UserRegistrationSaga;

  beforeEach(() => {
    saga = new UserRegistrationSaga();
  });

  it('dispatches SendWelcomeEmailCommand when UserCreatedEvent fires', (done) => {
    const events$ = new Subject<unknown>();
    const commands$ = saga.userRegistration(events$.asObservable());

    const user = makeUser();
    const event = new UserCreatedEvent(user, 'op-1', 'actor-1');

    commands$.subscribe((command) => {
      expect(command).toBeInstanceOf(SendWelcomeEmailCommand);
      const cmd = command as SendWelcomeEmailCommand;
      expect(cmd.userId).toBe('user-1');
      expect(cmd.email).toBe('test@example.com');
      expect(cmd.operationId).toBe('op-1');
      done();
    });

    events$.next(event);
  });

  it('filters out events that are not UserCreatedEvent', (done) => {
    const events$ = new Subject<unknown>();
    const commands$ = saga.userRegistration(events$.asObservable());

    let count = 0;
    commands$.subscribe(() => count++);

    events$.next({ type: 'SomeOtherEvent' });
    events$.next({ type: 'AnotherEvent' });

    setTimeout(() => {
      expect(count).toBe(0);
      done();
    }, 50);
  });

  it('handles multiple UserCreatedEvents in sequence', (done) => {
    const events$ = new Subject<unknown>();
    const commands$ = saga.userRegistration(events$.asObservable());

    const collected: SendWelcomeEmailCommand[] = [];
    commands$.subscribe((command) => {
      collected.push(command as SendWelcomeEmailCommand);
      if (collected.length === 2) {
        expect(collected[0].userId).toBe('user-1');
        expect(collected[1].userId).toBe('user-2');
        done();
      }
    });

    events$.next(new UserCreatedEvent(makeUser({ id: 'user-1', email: 'a@example.com' }), 'op-1'));
    events$.next(new UserCreatedEvent(makeUser({ id: 'user-2', email: 'b@example.com' }), 'op-2'));
  });
});
